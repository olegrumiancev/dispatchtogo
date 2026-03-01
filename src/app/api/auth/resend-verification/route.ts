import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent enumeration
    if (user && !user.emailVerified) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expires,
        },
      });

      const verifyUrl = `${process.env.NEXTAUTH_URL || "https://dispatchtogo.com"}/api/auth/verify-email?token=${token}`;

      await sendEmail(
        user.email,
        "Verify Your Email — DispatchToGo",
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="margin:0 0 16px">Verify Your Email</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="${verifyUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Verify Email</a>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 24 hours.</p>
            <p style="color:#6b7280;font-size:12px;word-break:break-all">If the button doesn't work: ${verifyUrl}</p>
          </div>
        </div>`
      );
    }

    return NextResponse.json({
      message: "If that email exists and is unverified, a verification link has been sent.",
    });
  } catch (error) {
    console.error("[POST /api/auth/resend-verification]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
