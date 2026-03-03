import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
      return NextResponse.json({ success: true, action: "enabled" });
    }

    // Delete — cascade-remove related records first
    if (action === "delete") {
      // Delete related records that reference the user
      await prisma.$transaction([
        prisma.requestView.deleteMany({ where: { userId: id } }),
        prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
        prisma.notification.deleteMany({ where: { userId: id } }),
        prisma.chatMessage.deleteMany({ where: { userId: id } }),
        prisma.jobNote.deleteMany({ where: { userId: id } }),
        prisma.auditLog.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
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
