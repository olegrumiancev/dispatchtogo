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

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Invalidate any existing tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Create new token (valid for 1 hour)
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const resetUrl = `${process.env.NEXTAUTH_URL || "https://dispatchtogo.com"}/reset-password?token=${token}`;

      await sendEmail(
        user.email,
        "Reset Your Password — DispatchToGo",
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="margin:0 0 16px">Reset Your Password</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>We received a request to reset your password. Click the button below to choose a new one:</p>
            <a href="${resetUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Reset Password</a>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
            <p style="color:#6b7280;font-size:13px">If the button doesn't work, copy and paste this URL into your browser:</p>
            <p style="color:#6b7280;font-size:12px;word-break:break-all">${resetUrl}</p>
          </div>
        </div>`
      );
    }

    // Always return success
    return NextResponse.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
