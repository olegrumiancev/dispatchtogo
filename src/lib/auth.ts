import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyTurnstile } from "@/lib/turnstile";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const captchaOk = await verifyTurnstile(credentials.turnstileToken);
        if (!captchaOk) {
          throw new Error("CAPTCHA_FAILED");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { organization: true, vendor: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        // Check email verification
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Check if account is disabled
        if (user.isDisabled) {
          throw new Error("ACCOUNT_DISABLED");
        }

        if (
          user.role === "OPERATOR" &&
          user.organization &&
          user.organization.status !== "ACTIVE"
        ) {
          if (user.organization.status === "SUSPENDED") {
            throw new Error("ORG_SUSPENDED");
          }
          if (user.organization.status === "OFFBOARDED") {
            throw new Error("ORG_OFFBOARDED");
          }
        }

        if (
          user.role === "VENDOR" &&
          user.vendor &&
          user.vendor.status !== "ACTIVE"
        ) {
          if (user.vendor.status === "SUSPENDED") {
            throw new Error("VENDOR_SUSPENDED");
          }
          if (user.vendor.status === "OFFBOARDED") {
            throw new Error("VENDOR_OFFBOARDED");
          }
        }

        // Check admin approval (admins skip this check)
        if (user.role !== "ADMIN" && !user.isApproved) {
          if (user.rejectedAt) {
            throw new Error("ACCOUNT_REJECTED");
          }
          throw new Error("ACCOUNT_PENDING_APPROVAL");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          vendorId: (user as any).vendorId ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.vendorId = (user as any).vendorId;
      }
      if (trigger === "update" && session) {
        token.name = session.name ?? null;
        token.email = session.email ?? token.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).vendorId = token.vendorId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/app/login",
  },
};

/**
 * auth() – returns the current server session (used across API routes).
 */
export async function auth() {
  return await getServerSession(authOptions);
}

/**
 * handlers – { GET, POST } for the [...nextauth] route.
 * In NextAuth v4 these are produced by NextAuth(authOptions).
 */
const nextAuthHandler = NextAuth(authOptions);
export const handlers = {
  GET: nextAuthHandler,
  POST: nextAuthHandler,
};

export { getServerSession };
