import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
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
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.vendorId = (user as any).vendorId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).vendorId = token.vendorId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

/**
 * auth() \u2013 returns the current server session (used across API routes).
 */
export async function auth() {
  return await getServerSession(authOptions);
}

/**
 * handlers \u2013 { GET, POST } for the [...nextauth] route.
 * In NextAuth v4 these are produced by NextAuth(authOptions).
 */
const nextAuthHandler = NextAuth(authOptions);
export const handlers = {
  GET: nextAuthHandler,
  POST: nextAuthHandler,
};

export { getServerSession };
