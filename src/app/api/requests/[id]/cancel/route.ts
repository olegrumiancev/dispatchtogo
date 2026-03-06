import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendJobCancelledToVendorSms } from "@/lib/sms";
import { sendJobCancelledToVendorEmail } from "@/lib/email";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";

// Statuses where a human vendor may already be assigned and on-site
const ACTIVE_JOB_STATUSES = ["DISPATCHED", "ACCEPTED", "IN_PROGRESS"];
const PRE_DISPATCH_STATUSES = ["SUBMITTED", "TRIAGING", "NEEDS_CLARIFICATION", "READY_TO_DISPATCH", ...ACTIVE_JOB_STATUSES];

/**
 * POST /api/requests/[id]/cancel
 * Allows an OPERATOR to soft-cancel their own pre-dispatch request.
 * History is retained; status is set to CANCELLED.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "OPERATOR" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const where: any = { id };
  if (user.role === "OPERATOR") {
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
    }
    where.organizationId = user.organizationId;
  }

  const current = await prisma.serviceRequest.findFirst({
    where,
    include: {
      property: true,
      job: { include: { vendor: true } },
    },
  });
  if (!current) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  if (!PRE_DISPATCH_STATUSES.includes(current.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a request with status "${current.status}". Only pre-dispatch or active requests can be cancelled.` },
      { status: 422 }
    );
  }

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: {
      status: "CANCELLED",
      resolvedAt: new Date(),
    },
  });

  // If a vendor was assigned, notify them
  const job = current.job as any;
  const vendor = job?.vendor;
  if (vendor && ACTIVE_JOB_STATUSES.includes(current.status)) {
    const propertyName = (current.property as any)?.name ?? "your assigned property";
    const refNum = (current as any).referenceNumber ?? id;

    // SMS to vendor (fire-and-forget)
    sendJobCancelledToVendorSms(vendor.phone, refNum, propertyName)
      .catch((e) => console.error("[cancel] SMS to vendor failed:", e));

    // Email to vendor (fire-and-forget)
    if (NOTIFICATION_SETTINGS.emailEnabled && vendor.email) {
      sendJobCancelledToVendorEmail(vendor.email, vendor.companyName, refNum, propertyName)
        .catch((e) => console.error("[cancel] Email to vendor failed:", e));
    }

    // In-app notification for the vendor's user account(s)
    prisma.user.findMany({ where: { vendorId: vendor.id }, select: { id: true } })
      .then((vendorUsers) => {
        if (!vendorUsers.length) return;
        return prisma.notification.createMany({
          data: vendorUsers.map((u) => ({
            userId: u.id,
            title: `Job cancelled – ${refNum}`,
            body: `Job ${refNum} at ${propertyName} has been cancelled by the operator. No further action required.`,
            type: "REQUEST_CANCELLED",
            link: `/app/vendor/jobs`,
          })),
        });
      })
      .catch((e) => console.error("[cancel] In-app notification failed:", e));
  }

  return NextResponse.json(updated);
}
