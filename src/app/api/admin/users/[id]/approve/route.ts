import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
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

      // Send approval email to the user
      if (NOTIFICATION_SETTINGS.emailEnabled) {
        const appUrl = process.env.NEXTAUTH_URL || "https://dispatchtogo.com";
        const roleName = targetUser.role === "OPERATOR" ? "operator" : "vendor";

        sendEmail(
          targetUser.email,
          "Your Account Has Been Approved — DispatchToGo",
          `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#16a34a;color:#fff;padding:20px;border-radius:8px 8px 0 0">
              <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
            </div>
            <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <h2 style="margin:0 0 16px">Account Approved!</h2>
              <p>Hi ${targetUser.name || "there"},</p>
              <p>Great news — your ${roleName} account has been approved. You can now sign in and start using DispatchToGo.</p>
              <a href="${appUrl}/app/login" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Sign In Now</a>
              <p style="color:#6b7280;font-size:13px;margin-top:24px">Welcome to the platform!</p>
            </div>
          </div>`,
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

    // Send rejection email to the user
    if (NOTIFICATION_SETTINGS.emailEnabled) {
      sendEmail(
        targetUser.email,
        "Account Registration Update — DispatchToGo",
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="margin:0 0 16px">Registration Update</h2>
            <p>Hi ${targetUser.name || "there"},</p>
            <p>Thank you for your interest in DispatchToGo. Unfortunately, we are unable to approve your account at this time.</p>
            ${rejectionNote ? `<p style="background:#f9fafb;border-left:4px solid #6b7280;padding:12px;border-radius:0 6px 6px 0;margin:16px 0"><strong>Note:</strong> ${rejectionNote}</p>` : ""}
            <p>If you have questions, please contact us at <a href="mailto:admin@dispatchtogo.com" style="color:#1e40af">admin@dispatchtogo.com</a>.</p>
          </div>
        </div>`,
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
