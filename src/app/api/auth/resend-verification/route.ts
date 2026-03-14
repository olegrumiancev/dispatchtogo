import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderEmailTemplate } from "@/lib/email-templates";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  try {
    const { email, captchaToken } = await request.json();

    const captchaOk = await verifyTurnstile(captchaToken);
    if (!captchaOk) {
      return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
    }

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
      const { subject, html } = await renderEmailTemplate("verification", {
        name: user.name || "there",
        verifyUrl,
      });

      await sendEmail(
        user.email,
        subject,
        html,
        undefined,
        { eventKey: "emailVerification" }
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
