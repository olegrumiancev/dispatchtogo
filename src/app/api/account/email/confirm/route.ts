import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, writeAuditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function getAccountPath(role: string) {
  if (role === "ADMIN") return "/app/admin/account";
  if (role === "VENDOR") return "/app/vendor/account";
  return "/app/operator/account";
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/app/login?error=email-change-invalid", request.url));
  }

  const changeToken = await prisma.emailChangeToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!changeToken || changeToken.usedAt || changeToken.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/app/login?error=email-change-invalid", request.url));
  }

  const conflictingUser = await prisma.user.findUnique({
    where: { email: changeToken.newEmail },
    select: { id: true },
  });

  if (conflictingUser && conflictingUser.id !== changeToken.userId) {
    await prisma.emailChangeToken.update({
      where: { id: changeToken.id },
      data: { usedAt: new Date() },
    });
    return NextResponse.redirect(new URL("/app/login?error=email-change-conflict", request.url));
  }

  const previousEmail = changeToken.user.email;
  const nextEmail = changeToken.newEmail;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: changeToken.userId },
      data: {
        email: nextEmail,
      },
    });

    await tx.emailChangeToken.update({
      where: { id: changeToken.id },
      data: { usedAt: now },
    });

    await tx.emailChangeToken.updateMany({
      where: {
        userId: changeToken.userId,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    await writeAuditLog({
      client: tx,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: changeToken.userId,
      action: AUDIT_ACTIONS.ACCOUNT_EMAIL_CHANGED,
      actorUserId: changeToken.userId,
      metadata: {
        previousEmail,
        nextEmail,
        confirmedAt: now.toISOString(),
      },
    });
  });

  sendEmail(
    previousEmail,
    "Your Login Email Was Changed — DispatchToGo",
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Login email updated</h2>
        <p>Hi ${changeToken.user.name || "there"},</p>
        <p>Your DispatchToGo login email has been changed from <strong>${previousEmail}</strong> to <strong>${nextEmail}</strong>.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">If you did not authorize this change, contact support immediately.</p>
      </div>
    </div>`
  ).catch((error) => {
    console.error("[GET /api/account/email/confirm] old-email confirmation failed", error);
  });

  const session = await auth();
  if ((session?.user as any)?.id === changeToken.userId) {
    const user = session!.user as any;
    const target = new URL(
      `${getAccountPath(user.role)}?emailChange=confirmed&email=${encodeURIComponent(nextEmail)}`,
      request.url
    );
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(
    new URL(`/app/login?emailChanged=true&email=${encodeURIComponent(nextEmail)}`, request.url)
  );
}
