import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendRejectionSms,
  sendVendorRejectionSms,
} from "@/lib/sms";
import {
  sendVendorRejectionEmail,
  sendAdminRejectionEmail,
  sendWorkVerifiedToVendorEmail,
} from "@/lib/email";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";

// Valid status transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["TRIAGING", "NEEDS_CLARIFICATION", "READY_TO_DISPATCH", "CANCELLED"],
  TRIAGING: ["NEEDS_CLARIFICATION", "READY_TO_DISPATCH", "CANCELLED"],
  NEEDS_CLARIFICATION: ["TRIAGING", "READY_TO_DISPATCH", "CANCELLED"],
  READY_TO_DISPATCH: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["ACCEPTED", "READY_TO_DISPATCH", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "READY_TO_DISPATCH", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["VERIFIED", "IN_PROGRESS", "READY_TO_DISPATCH", "DISPUTED"],
  DISPUTED: [],
  VERIFIED: [],
  CANCELLED: [],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  const where: any = { id };

  // OPERATOR can only see their own org's requests
  if (user.role === "OPERATOR") {
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
    }
    where.organizationId = user.organizationId;
  }

  const serviceRequest = await prisma.serviceRequest.findFirst({
    where,
    include: {
      property: true,
      photos: true,
      job: {
        include: {
          vendor: true,
          notes: {
            include: { author: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { createdAt: "asc" },
          },
          photos: true,
          materials: true,
          proofPacket: true,
        },
      },
      invoice: true,
    },
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  return NextResponse.json(serviceRequest);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;
  const body = await request.json();

  const { action, rejectionType, rejectionReason, status, urgency, description, aiTriageSummary, aiUrgencyScore } = body;

  // ── Operator: verify completion ──────────────────────────────────────────
  if (action === "verify_completion") {
    if (user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const current = await prisma.serviceRequest.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!current) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }
    if (current.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Cannot verify: request is ${current.status}, expected COMPLETED` },
        { status: 422 }
      );
    }

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: { status: "VERIFIED", resolvedAt: new Date() },
      include: {
        property: true,
        photos: true,
        job: {
          include: {
            vendor: true,
            notes: { include: { author: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "asc" } },
            photos: true,
            materials: true,
            proofPacket: true,
          },
        },
        invoice: true,
      },
    });

    // Notify the vendor: their work has been approved
    const job = updated.job as any;
    const vendor = job?.vendor;
    const propertyName = (updated.property as any)?.name ?? "the property";
    const refNum = (updated as any).referenceNumber ?? id;

    if (vendor && job) {
      // In-app notification
      prisma.user.findFirst({ where: { vendorId: vendor.id }, select: { id: true } })
        .then((vendorUser) => {
          if (!vendorUser) return;
          return prisma.notification.create({
            data: {
              userId: vendorUser.id,
              title: `Work approved – ${refNum}`,
              body: `Your completed work on job ${refNum} at ${propertyName} has been reviewed and approved.`,
              type: "WORK_VERIFIED",
              link: `/app/vendor/jobs/${job.id}`,
            },
          });
        })
        .catch((e) => console.error("[verify] In-app notification failed:", e));

      // Email to vendor
      if (NOTIFICATION_SETTINGS.emailEnabled && vendor.email) {
        sendWorkVerifiedToVendorEmail(vendor.email, vendor.companyName, refNum, propertyName)
          .catch((e) => console.error("[verify] Email to vendor failed:", e));
      }
    }

    return NextResponse.json(updated);
  }

  // ── Operator: reject completion ──────────────────────────────────────────
  if (action === "reject_completion") {
    if (user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
    }
    const VALID_REJECTION_TYPES = ["send_back", "redispatch", "dispute"] as const;
    if (!VALID_REJECTION_TYPES.includes(rejectionType)) {
      return NextResponse.json({ error: "Invalid rejection type" }, { status: 400 });
    }

    const current = await prisma.serviceRequest.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        property: true,
        job: { include: { vendor: true } },
      },
    });
    if (!current) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }
    if (current.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Cannot reject: request is ${current.status}, expected COMPLETED` },
        { status: 422 }
      );
    }

    // Determine new status based on rejection type
    const newStatus =
      rejectionType === "send_back"
        ? "IN_PROGRESS"
        : rejectionType === "redispatch"
        ? "READY_TO_DISPATCH"
        : "DISPUTED"; // dispute

    // Update service request
    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason: rejectionReason.trim(),
      },
      include: {
        property: true,
        photos: true,
        job: {
          include: {
            vendor: true,
            notes: { include: { author: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "asc" } },
            photos: true,
            materials: true,
            proofPacket: true,
          },
        },
        invoice: true,
      },
    });

    // Job record updates based on rejection type
    if (current.job) {
      if (rejectionType === "send_back") {
        // Clear completedAt so the job re-appears in the vendor's "My Jobs" (active) tab
        await prisma.job.update({
          where: { id: current.job.id },
          data: { completedAt: null },
        });
      } else if (rejectionType === "redispatch") {
        // Mark job as REJECTED so vendor sees why they were removed
        await prisma.job.update({
          where: { id: current.job.id },
          data: { status: "REJECTED" },
        });
      }
    }

    // Create in-app notification for the vendor's user account
    const vendor = current.job?.vendor ?? null;
    const refNum = (current as any).referenceNumber ?? id;

    if (current.job) {
      const vendorUser = await prisma.user.findFirst({
        where: { vendorId: current.job.vendorId },
        select: { id: true },
      });
      if (vendorUser) {
        const notifTitle =
          rejectionType === "send_back"
            ? `Work sent back for rework – ${refNum}`
            : rejectionType === "redispatch"
            ? `Assignment removed – ${refNum}`
            : `Job escalated to admin – ${refNum}`;
        const notifBody =
          rejectionType === "send_back"
            ? `The operator requires rework on job ${refNum}. Reason: ${rejectionReason.trim()}`
            : rejectionType === "redispatch"
            ? `Your assignment on job ${refNum} has been removed and will be re-dispatched. Reason: ${rejectionReason.trim()}`
            : `Job ${refNum} has been escalated to an administrator for review. Reason: ${rejectionReason.trim()}`;
        await prisma.notification.create({
          data: { userId: vendorUser.id, title: notifTitle, body: notifBody, type: "WORK_REJECTED", link: `/app/vendor/jobs/${current.job.id}` },
        });
      }
    }

    // Fire SMS/email notifications (non-blocking)

    if (vendor) {
      // SMS to vendor
      sendVendorRejectionSms(vendor.phone, vendor.companyName, refNum, rejectionReason.trim(), rejectionType)
        .catch((e) => console.error("[notify] vendor SMS rejection failed", e));

      // Email to vendor
      sendVendorRejectionEmail(vendor.email, vendor.companyName, refNum, rejectionReason.trim(), rejectionType, current.property as any)
        .catch((e) => console.error("[notify] vendor email rejection failed", e));
    }

    // Email to all admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true, name: true } });
    for (const admin of admins) {
      sendAdminRejectionEmail(admin.email, admin.name ?? "Admin", refNum, rejectionReason.trim(), rejectionType, vendor?.companyName ?? "Unknown vendor")
        .catch((e) => console.error("[notify] admin email rejection failed", e));
    }

    return NextResponse.json(updated);
  }

  // ── Admin: status transitions and triage updates ─────────────────────────
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch current state
  const current = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  // If status is being updated, validate transition
  if (status) {
    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${current.status} -> ${status}. Allowed: ${allowed.join(", ") || "none"}`,
        },
        { status: 422 }
      );
    }
  }

  const data: any = {};
  if (status) data.status = status;
  if (urgency !== undefined) data.urgency = urgency;
  if (description !== undefined) data.description = description;
  if (aiTriageSummary !== undefined) data.aiTriageSummary = aiTriageSummary;
  if (aiUrgencyScore !== undefined) data.aiUrgencyScore = aiUrgencyScore;

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data,
    include: {
      property: true,
      photos: true,
      job: {
        include: {
          vendor: true,
          notes: {
            include: { author: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { createdAt: "asc" },
          },
          photos: true,
          materials: true,
          proofPacket: true,
        },
      },
      invoice: true,
    },
  });

  return NextResponse.json(updated);
}
