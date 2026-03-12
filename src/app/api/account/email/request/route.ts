import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, writeAuditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const body = await request.json().catch(() => null);

  const newEmail = typeof body?.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";

  if (!newEmail || !currentPassword) {
    return NextResponse.json(
      { error: "newEmail and currentPassword are required" },
      { status: 400 }
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!currentUser?.passwordHash) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (newEmail === currentUser.email) {
    return NextResponse.json(
      { error: "New email must be different from your current email" },
      { status: 400 }
    );
  }

  const [existingAccount, matches] = await Promise.all([
    prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    }),
    bcrypt.compare(currentPassword, currentUser.passwordHash),
  ]);

  if (!matches) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  if (existingAccount) {
    return NextResponse.json(
      { error: "That email address is already in use" },
      { status: 409 }
    );
  }

  const now = new Date();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const confirmUrl = `${appBase}/api/account/email/confirm?token=${token}`;

  const createdToken = await prisma.$transaction(async (tx) => {
    await tx.emailChangeToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    await writeAuditLog({
      client: tx,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      action: AUDIT_ACTIONS.ACCOUNT_EMAIL_CHANGE_REQUESTED,
      actorUserId: user.id,
      metadata: {
        previousEmail: currentUser.email,
        requestedEmail: newEmail,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return tx.emailChangeToken.create({
      data: {
        userId: user.id,
        newEmail,
        token,
        expiresAt,
      },
    });
  });

  const confirmationEmail = await sendEmail(
    newEmail,
    "Confirm Your New Email — DispatchToGo",
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Confirm your new email</h2>
        <p>Hi ${currentUser.name || "there"},</p>
        <p>We received a request to change the login email on your DispatchToGo account from <strong>${currentUser.email}</strong> to <strong>${newEmail}</strong>.</p>
        <a href="${confirmUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Confirm New Email</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 24 hours. If you did not request this change, you can ignore this message.</p>
        <p style="color:#6b7280;font-size:12px;word-break:break-all">If the button doesn't work: ${confirmUrl}</p>
      </div>
    </div>`
  );

  if (!confirmationEmail.success) {
    await prisma.emailChangeToken.update({
      where: { id: createdToken.id },
      data: { usedAt: new Date() },
    });
    return NextResponse.json(
      { error: "Unable to send confirmation email right now. Please try again later." },
      { status: 503 }
    );
  }

  sendEmail(
    currentUser.email,
    "Email Change Requested — DispatchToGo",
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Email change requested</h2>
        <p>Hi ${currentUser.name || "there"},</p>
        <p>A request was made to change the login email on your account from <strong>${currentUser.email}</strong> to <strong>${newEmail}</strong>.</p>
        <p>If this was you, complete the change using the confirmation email sent to the new address.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">If you did not request this change, you can ignore this message and your login email will stay the same.</p>
      </div>
    </div>`
  ).catch((error) => {
    console.error("[POST /api/account/email/request] old-email notice failed", error);
  });

  return NextResponse.json({
    message: "Confirmation email sent. Check your new inbox to finish changing your login email.",
  });
}
