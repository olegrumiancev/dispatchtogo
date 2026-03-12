import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = session.user as any;
    if (adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!["disable", "enable", "delete"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admins from disabling/deleting themselves or other admins
    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot modify admin accounts" },
        { status: 403 }
      );
    }

    if (action === "disable") {
      await prisma.user.update({
        where: { id },
        data: {
          isDisabled: true,
          disabledAt: new Date(),
        },
      });
      await writeAuditLog({
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: id,
        action: AUDIT_ACTIONS.USER_DISABLED,
        actorUserId: adminUser.id,
        metadata: {
          targetRole: targetUser.role,
          targetEmail: targetUser.email,
        },
      });
      return NextResponse.json({ success: true, action: "disabled" });
    }

    if (action === "enable") {
      await prisma.user.update({
        where: { id },
        data: {
          isDisabled: false,
          disabledAt: null,
        },
      });
      await writeAuditLog({
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: id,
        action: AUDIT_ACTIONS.USER_ENABLED,
        actorUserId: adminUser.id,
        metadata: {
          targetRole: targetUser.role,
          targetEmail: targetUser.email,
        },
      });
      return NextResponse.json({ success: true, action: "enabled" });
    }

    // Delete — cascade-remove related records first
    if (action === "delete") {
      // Delete related records that reference the user
      await prisma.$transaction(async (tx) => {
        await tx.requestView.deleteMany({ where: { userId: id } });
        await tx.passwordResetToken.deleteMany({ where: { userId: id } });
        await tx.notification.deleteMany({ where: { userId: id } });
        await tx.chatMessage.deleteMany({ where: { userId: id } });
        await tx.jobNote.deleteMany({ where: { userId: id } });
        await tx.auditLog.deleteMany({ where: { userId: id } });
        await writeAuditLog({
          client: tx,
          entityType: AUDIT_ENTITY_TYPES.USER,
          entityId: id,
          action: AUDIT_ACTIONS.USER_DELETED,
          actorUserId: adminUser.id,
          metadata: {
            targetRole: targetUser.role,
            targetEmail: targetUser.email,
          },
        });
        await tx.user.delete({ where: { id } });
      });
      return NextResponse.json({ success: true, action: "deleted" });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/admin/users/[id]/manage]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
