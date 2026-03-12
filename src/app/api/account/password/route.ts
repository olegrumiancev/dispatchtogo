import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const body = await request.json().catch(() => null);

  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "currentPassword, newPassword, and confirmPassword are required" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must be different from your current password" },
      { status: 400 }
    );
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!account?.passwordHash) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const matches = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!matches) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    await writeAuditLog({
      client: tx,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      action: AUDIT_ACTIONS.ACCOUNT_PASSWORD_CHANGED,
      actorUserId: user.id,
      metadata: {
        invalidatedPasswordResetTokensAt: now.toISOString(),
      },
    });
  });

  return NextResponse.json({ message: "Password changed successfully." });
}
