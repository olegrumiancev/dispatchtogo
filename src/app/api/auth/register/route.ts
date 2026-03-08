import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORIES, ORGANIZATION_TYPES } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, organizationName, organizationType, companyName, phone, categories, captchaToken, tosAccepted } = body;

    const captchaOk = await verifyTurnstile(captchaToken);
    if (!captchaOk) {
      return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
    }

    if (role === "OPERATOR" && !tosAccepted) {
      return NextResponse.json({ error: "You must accept the Terms of Service to create an account." }, { status: 400 });
    }

    const clientIp =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      null;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "email, password, and role are required" },
        { status: 400 }
      );
    }

    if (!["OPERATOR", "VENDOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate email verification token (valid 24 hours)
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let user;

    if (role === "OPERATOR") {
      if (!organizationName) {
        return NextResponse.json(
          { error: "organizationName is required for OPERATOR role" },
          { status: 400 }
        );
      }

      const allowedOrgTypes = new Set<string>(ORGANIZATION_TYPES.map((t) => t.value));
      const orgType = typeof organizationType === "string" && allowedOrgTypes.has(organizationType)
        ? organizationType
        : "OTHER";

      const organization = await prisma.organization.create({
        data: {
          name: organizationName,
          type: orgType,
          contactEmail: normalizedEmail,
          contactPhone: phone ?? null,
          termsAcceptedAt: tosAccepted ? new Date() : null,
          termsAcceptedIp: tosAccepted ? (clientIp ?? null) : null,
        },
      });

      user = await prisma.user.create({
        data: {
          name: name ?? null,
          email: normalizedEmail,
          passwordHash,
          role: "OPERATOR",
          organizationId: organization.id,
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpires,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          vendorId: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    } else if (role === "VENDOR") {
      if (!companyName) {
        return NextResponse.json(
          { error: "companyName is required for VENDOR role" },
          { status: 400 }
        );
      }

      const allowedCategories = new Set<string>(SERVICE_CATEGORIES.map((c) => c.value));
      const parsedCategories: string[] = Array.isArray(categories)
        ? categories
            .filter((c: any) => typeof c === "string")
            .map((c: any) => c.trim())
            .filter((c: string) => c.length > 0 && allowedCategories.has(c))
        : [];

      const uniqueCategories = Array.from(new Set(parsedCategories));
      if (uniqueCategories.length === 0) {
        return NextResponse.json(
          { error: "At least one valid category is required for VENDOR role" },
          { status: 400 }
        );
      }

      const vendor = await prisma.vendor.create({
        data: {
          companyName,
          contactName: name ?? companyName,
          email: normalizedEmail,
          phone: phone ?? "",
          skills: {
            create: uniqueCategories.map((category) => ({ category })),
          },
        },
      });

      user = await prisma.user.create({
        data: {
          name: name ?? null,
          email: normalizedEmail,
          passwordHash,
          role: "VENDOR",
          vendorId: vendor.id,
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpires,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          vendorId: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    } else {
      // ADMIN
      user = await prisma.user.create({
        data: {
          name: name ?? null,
          email: normalizedEmail,
          passwordHash,
          role: "ADMIN",
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpires,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          vendorId: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    }

    // Send verification email (fire-and-forget)
    if (NOTIFICATION_SETTINGS.emailEnabled) {
      const verifyUrl = `${process.env.NEXTAUTH_URL || "https://dispatchtogo.com"}/api/auth/verify-email?token=${emailVerificationToken}`;

      sendEmail(
        user.email,
        "Verify Your Email \u2014 DispatchToGo",
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="margin:0 0 16px">Welcome to DispatchToGo!</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>Thanks for signing up! Please verify your email address to get started:</p>
            <a href="${verifyUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Verify Email Address</a>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
            <p style="color:#6b7280;font-size:12px;word-break:break-all">If the button doesn't work: ${verifyUrl}</p>
          </div>
        </div>`,
        undefined,
        { eventKey: "emailVerification" }
      ).then((r: any) => {
        if (!r.success) console.error(`[register] Verification email failed:`, r.error);
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
