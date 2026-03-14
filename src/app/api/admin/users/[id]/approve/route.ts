import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderEmailTemplate } from "@/lib/email-templates";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";

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
    const { action, rejectionNote } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
        vendor: { select: { companyName: true } },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "approve") {
      await prisma.user.update({
        where: { id },
        data: {
          isApproved: true,
          rejectedAt: null,
          rejectionNote: null,
        },
      });

      await writeAuditLog({
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: id,
        action: AUDIT_ACTIONS.USER_APPROVED,
        actorUserId: adminUser.id,
        metadata: {
          targetRole: targetUser.role,
          targetEmail: targetUser.email,
        },
      });

      // Send approval email to the user
      if (NOTIFICATION_SETTINGS.emailEnabled) {
        const appUrl = process.env.NEXTAUTH_URL || "https://dispatchtogo.com";
        const roleName = targetUser.role === "OPERATOR" ? "operator" : "vendor";
        const { subject, html } = await renderEmailTemplate("accountApproved", {
          name: targetUser.name || "there",
          roleName,
          loginUrl: `${appUrl}/app/login`,
        });

        sendEmail(
          targetUser.email,
          subject,
          html,
          undefined,
          { eventKey: "emailAccountApproved" }
        ).then((r) => {
          if (!r.success) console.error(`[approve] Email failed for ${targetUser.email}:`, r.error);
        });
      }

      return NextResponse.json({ success: true, action: "approved" });
    }

    // Reject
    await prisma.user.update({
      where: { id },
      data: {
        isApproved: false,
        rejectedAt: new Date(),
        rejectionNote: rejectionNote || null,
      },
    });

    await writeAuditLog({
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: id,
      action: AUDIT_ACTIONS.USER_REJECTED,
      actorUserId: adminUser.id,
      metadata: {
        targetRole: targetUser.role,
        targetEmail: targetUser.email,
        rejectionNote: rejectionNote || null,
      },
    });

    // Send rejection email to the user
    if (NOTIFICATION_SETTINGS.emailEnabled) {
      const { subject, html } = await renderEmailTemplate("accountRejected", {
        name: targetUser.name || "there",
        rejectionNoteBlock: rejectionNote
          ? {
              value: `<p style="background:#f9fafb;border-left:4px solid #6b7280;padding:12px;border-radius:0 6px 6px 0;margin:16px 0"><strong>Note:</strong> ${rejectionNote}</p>`,
              safe: true,
            }
          : "",
      });
      sendEmail(
        targetUser.email,
        subject,
        html,
        undefined,
        { eventKey: "emailAccountRejected" }
      ).then((r) => {
        if (!r.success) console.error(`[reject] Email failed for ${targetUser.email}:`, r.error);
      });
    }

    return NextResponse.json({ success: true, action: "rejected" });
  } catch (error) {
    console.error("[POST /api/admin/users/[id]/approve]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
