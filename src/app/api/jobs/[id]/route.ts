import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCompletionAssist } from "@/lib/ai-assist";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import { ensureVendorIsActiveForMutation } from "@/lib/vendor-lifecycle";
import {
  sendOperatorStatusUpdate,
  sendJobCompletionNotification,
  sendVendorEnrouteNotification,
  sendWorkPausedNotification,
  sendWorkResumedNotification,
  sendJobDeclinedNotification,
} from "@/lib/sms";
import {
  sendOperatorStatusEmail,
  sendJobCompletionEmail,
  sendVendorDeclinedOperatorEmail,
} from "@/lib/email";

const JOB_INCLUDE = {
  serviceRequest: {
    include: {
      property: true,
      photos: true,
    },
  },
  vendor: true,
  notes: {
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  photos: true,
  materials: true,
  proofPacket: true,
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

  const job = await prisma.job.findUnique({
    where: { id },
    include: JOB_INCLUDE,
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // VENDOR can only see jobs assigned to them
  if (user.role === "VENDOR" && job.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // OPERATOR can only see jobs for their organization
  if (user.role === "OPERATOR" && job.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(job);
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

  const {
    action,
    vendorNotes,
    completionSummary,
    totalLabourHours,
    totalMaterialsCost,
    totalCost,
    declineReason,
  } = body;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { serviceRequest: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Only the assigned VENDOR or an ADMIN can update the job
  if (user.role === "VENDOR" && job.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "VENDOR") {
    const guard = await ensureVendorIsActiveForMutation(job.vendorId);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  if (user.role === "OPERATOR") {
    return NextResponse.json({ error: "Forbidden: OPERATORs cannot update jobs" }, { status: 403 });
  }

  const jobData: any = {};
  const requestData: any = {};

  if (vendorNotes !== undefined) jobData.vendorNotes = vendorNotes;
  if (completionSummary !== undefined) jobData.completionSummary = completionSummary;
  if (totalLabourHours !== undefined) jobData.totalLabourHours = totalLabourHours;
  if (totalMaterialsCost !== undefined) jobData.totalMaterialsCost = totalMaterialsCost;
  if (totalCost !== undefined) jobData.totalCost = totalCost;

  let newStatus: string | null = null;

  if (action) {
    switch (action) {
      case "accept":
        jobData.acceptedAt = new Date();
        requestData.status = "ACCEPTED";
        newStatus = "ACCEPTED";
        break;
      case "enroute":
        jobData.enRouteAt = new Date();
        break;
      case "arrive":
        jobData.arrivedAt = new Date();
        requestData.status = "IN_PROGRESS";
        newStatus = "IN_PROGRESS";
        break;
      case "complete":
        jobData.completedAt = new Date();
        jobData.isPaused = false;
        jobData.pauseReason = null;
        jobData.pausedAt = null;
        jobData.estimatedReturnDate = null;
        requestData.status = "COMPLETED";
        requestData.resolvedAt = new Date();
        newStatus = "COMPLETED";
        break;
      case "pause":
        jobData.isPaused = true;
        jobData.pauseReason = body.pauseReason ?? null;
        jobData.pausedAt = new Date();
        if (body.estimatedReturnDate) {
          jobData.estimatedReturnDate = new Date(body.estimatedReturnDate);
        }
        break;
      case "resume":
        jobData.isPaused = false;
        jobData.pauseReason = null;
        jobData.pausedAt = null;
        jobData.estimatedReturnDate = null;
        break;
      case "decline":
        jobData.status = "DECLINED";
        if (declineReason) jobData.declineReason = String(declineReason).slice(0, 500);
        requestData.status = "READY_TO_DISPATCH";
        // We keep the Job record for audit purposes (status=DECLINED)
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  }

  // Run in transaction if we also need to update the service request
  if (Object.keys(requestData).length > 0) {
    await prisma.$transaction([
      prisma.job.update({ where: { id }, data: jobData }),
      prisma.serviceRequest.update({
        where: { id: job.serviceRequestId },
        data: requestData,
      }),
    ]);
  } else {
    await prisma.job.update({ where: { id }, data: jobData });
  }

  // Auto-flip vendor availability based on job lifecycle
  if (action === "accept" || action === "complete" || action === "decline") {
    const vendor = await prisma.vendor.findUnique({
      where: { id: job.vendorId },
      select: { multipleTeams: true, availabilityStatus: true },
    });
    if (vendor && !vendor.multipleTeams) {
      if (action === "accept" && vendor.availabilityStatus === "AVAILABLE") {
        // Single-team vendor just accepted a job → mark Busy
        await prisma.vendor.update({
          where: { id: job.vendorId },
          data: { availabilityStatus: "BUSY" },
        });
      } else if ((action === "complete" || action === "decline") && vendor.availabilityStatus === "BUSY") {
        // Check if they have any remaining open jobs
        const openJobCount = await prisma.job.count({
          where: {
            vendorId: job.vendorId,
            completedAt: null,
            status: { notIn: ["DECLINED", "COMPLETED"] },
          },
        });
        if (openJobCount === 0) {
          await prisma.vendor.update({
            where: { id: job.vendorId },
            data: { availabilityStatus: "AVAILABLE" },
          });
        }
      }
    }
  }

  const updated = await prisma.job.findUnique({
    where: { id },
    include: JOB_INCLUDE,
  });

  // Fire-and-forget SMS + email + in-app notifications
  if (action && updated) {
    const serviceRequest = updated.serviceRequest as any;
    const vendor = updated.vendor as any;
    const refNumber = serviceRequest?.referenceNumber ?? id;
    const orgId = updated.organizationId ?? "";
    const vendorName = vendor?.companyName ?? "the vendor";
    const propertyName = serviceRequest?.property?.name ?? "the property";

    prisma.organization
      .findUnique({ where: { id: orgId }, select: { contactPhone: true, contactEmail: true, email: true } })
      .then(async (org) => {
        const phone = org?.contactPhone;
        const email = org?.contactEmail || org?.email;

        // ── COMPLETED ───────────────────────────────────────────────────────
        if (newStatus === "COMPLETED" && NOTIFICATION_SETTINGS.notifyOperatorOnCompletion) {
          if (phone) {
            sendJobCompletionNotification(phone, refNumber, vendorName)
              .catch((e) => console.error("[job PATCH] Completion SMS failed:", e));
          }
          if (email && NOTIFICATION_SETTINGS.emailEnabled) {
            sendJobCompletionEmail(email, refNumber, vendorName)
              .catch((e) => console.error("[job PATCH] Completion email failed:", e));
          }
        }

        // ── ACCEPTED / IN_PROGRESS ───────────────────────────────────────────
        else if ((newStatus === "ACCEPTED" || newStatus === "IN_PROGRESS") && NOTIFICATION_SETTINGS.notifyOperatorOnStatusChange) {
          if (phone) {
            sendOperatorStatusUpdate(phone, refNumber, newStatus, vendorName)
              .catch((e) => console.error("[job PATCH] Status SMS failed:", e));
          }
          if (email && NOTIFICATION_SETTINGS.emailEnabled) {
            sendOperatorStatusEmail(email, refNumber, newStatus, vendorName)
              .catch((e) => console.error("[job PATCH] Status email failed:", e));
          }
        }

        // ── EN ROUTE ────────────────────────────────────────────────────────
        else if (action === "enroute" && NOTIFICATION_SETTINGS.notifyOperatorOnStatusChange) {
          if (phone) {
            sendVendorEnrouteNotification(phone, refNumber, propertyName, vendorName)
              .catch((e) => console.error("[job PATCH] En-route SMS failed:", e));
          }
        }

        // ── PAUSE ───────────────────────────────────────────────────────────
        else if (action === "pause") {
          if (phone) {
            sendWorkPausedNotification(
              phone,
              refNumber,
              propertyName,
              body.pauseReason ?? null,
              body.estimatedReturnDate ? new Date(body.estimatedReturnDate) : null
            ).catch((e) => console.error("[job PATCH] Pause SMS failed:", e));
          }
          // In-app notification for operator users
          prisma.user.findMany({
            where: { organizationId: orgId },
            select: { id: true },
          }).then((opUsers) => {
            if (!opUsers.length) return;
            return prisma.notification.createMany({
              data: opUsers.map((u) => ({
                userId: u.id,
                title: `Work paused – ${refNumber}`,
                body: `${vendorName} has paused work at ${propertyName}.${
                  body.pauseReason ? ` Reason: ${body.pauseReason}.` : ""
                }${
                  body.estimatedReturnDate ? ` Est. return: ${new Date(body.estimatedReturnDate).toLocaleDateString("en-CA")}.` : ""
                }`,
                type: "JOB_PAUSED",
                link: `/app/operator/requests/${job.serviceRequestId}`,
              })),
            });
          }).catch((e) => console.error("[job PATCH] Pause in-app notification failed:", e));
        }

        // ── RESUME ──────────────────────────────────────────────────────────
        else if (action === "resume") {
          if (phone) {
            sendWorkResumedNotification(phone, refNumber, propertyName)
              .catch((e) => console.error("[job PATCH] Resume SMS failed:", e));
          }
          prisma.user.findMany({
            where: { organizationId: orgId },
            select: { id: true },
          }).then((opUsers) => {
            if (!opUsers.length) return;
            return prisma.notification.createMany({
              data: opUsers.map((u) => ({
                userId: u.id,
                title: `Work resumed – ${refNumber}`,
                body: `${vendorName} has resumed work at ${propertyName}.`,
                type: "JOB_RESUMED",
                link: `/app/operator/requests/${job.serviceRequestId}`,
              })),
            });
          }).catch((e) => console.error("[job PATCH] Resume in-app notification failed:", e));
        }

        // ── DECLINE ─────────────────────────────────────────────────────────
        else if (action === "decline") {
          // SMS + email to operator
          if (phone) {
            sendJobDeclinedNotification(phone, refNumber, propertyName, vendorName)
              .catch((e) => console.error("[job PATCH] Decline SMS failed:", e));
          }
          if (email && NOTIFICATION_SETTINGS.emailEnabled) {
            sendVendorDeclinedOperatorEmail(email, refNumber, propertyName, vendorName, body.declineReason ?? null)
              .catch((e) => console.error("[job PATCH] Decline email failed:", e));
          }
          // In-app notification for admin users (re-dispatch attention needed)
          prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true },
          }).then((admins) => {
            if (!admins.length) return;
            return prisma.notification.createMany({
              data: admins.map((u) => ({
                userId: u.id,
                title: `Vendor declined – ${refNumber} needs re-dispatch`,
                body: `${vendorName} declined job ${refNumber} at ${propertyName}. Manual re-dispatch required.`,
                type: "JOB_DECLINED",
                link: `/app/admin/dispatch`,
              })),
            });
          }).catch((e) => console.error("[job PATCH] Decline admin in-app notification failed:", e));
        }
      })
      .catch((err) => {
        console.error("[job PATCH] Could not look up org for notifications:", err);
      });
  }

  if (action === "complete") {
    generateCompletionAssist(id).catch((err) => {
      console.error("[job PATCH] Failed to persist completion assist:", err);
    });
  }

  return NextResponse.json(updated);
}

export async function POST(
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

  const { type } = body;

  if (!type || !["note", "material", "photo"].includes(type)) {
    return NextResponse.json(
      { error: "type must be one of: note, material, photo" },
      { status: 400 }
    );
  }

  // Verify job exists
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // VENDOR can only add to their own jobs
  if (user.role === "VENDOR" && job.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "VENDOR") {
    const guard = await ensureVendorIsActiveForMutation(job.vendorId);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (type === "note") {
    const { text } = body;
    if (!text) {
      return NextResponse.json({ error: "text is required for note type" }, { status: 400 });
    }

    const note = await prisma.jobNote.create({
      data: {
        jobId: id,
        userId: user.id,
        text,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  }

  if (type === "material") {
    const { description, quantity, unitCost } = body;
    if (!description) {
      return NextResponse.json({ error: "description is required for material type" }, { status: 400 });
    }

    const material = await prisma.jobMaterial.create({
      data: {
        jobId: id,
        description,
        quantity: quantity ?? 1,
        unitCost: unitCost ?? 0,
      },
    });

    return NextResponse.json(material, { status: 201 });
  }

  if (type === "photo") {
    const { url, fullUrl, thumbnailUrl, photoType, latitude, longitude } = body;
    if (!url) {
      return NextResponse.json({ error: "url is required for photo type" }, { status: 400 });
    }

    const LOCKED_STATUSES = ["COMPLETED", "VERIFIED", "CANCELLED"];
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: job.serviceRequestId },
      select: { status: true },
    });
    if (sr && LOCKED_STATUSES.includes(sr.status)) {
      return NextResponse.json(
        { error: "Photos cannot be added after the job is complete" },
        { status: 409 }
      );
    }

    const photo = await prisma.jobPhoto.create({
      data: {
        jobId: id,
        url,
        fullUrl: fullUrl ?? null,
        thumbnailUrl: thumbnailUrl ?? null,
        type: photoType ?? "DURING",
      },
    });

    return NextResponse.json(photo, { status: 201 });
  }
}
