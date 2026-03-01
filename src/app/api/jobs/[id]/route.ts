import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import {
  sendOperatorStatusUpdate,
  sendJobCompletionNotification,
} from "@/lib/sms";
import {
  sendOperatorStatusEmail,
  sendJobCompletionEmail,
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

  const { action, vendorNotes, totalLabourHours, totalMaterialsCost, totalCost } = body;

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
  if (user.role === "OPERATOR") {
    return NextResponse.json({ error: "Forbidden: OPERATORs cannot update jobs" }, { status: 403 });
  }

  const jobData: any = {};
  const requestData: any = {};

  if (vendorNotes !== undefined) jobData.vendorNotes = vendorNotes;
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
        requestData.status = "COMPLETED";
        requestData.resolvedAt = new Date();
        newStatus = "COMPLETED";
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

  const updated = await prisma.job.findUnique({
    where: { id },
    include: JOB_INCLUDE,
  });

  // Fire-and-forget SMS + email notifications based on the new status
  if (newStatus && updated) {
    const serviceRequest = updated.serviceRequest as any;
    const vendor = updated.vendor as any;
    const refNumber = serviceRequest?.referenceNumber ?? id;
    const orgId = updated.organizationId ?? "";
    const vendorName = vendor?.companyName ?? "the vendor";

    prisma.organization
      .findUnique({ where: { id: orgId }, select: { contactPhone: true, contactEmail: true, email: true } })
      .then((org) => {
        const phone = org?.contactPhone;
        const email = org?.contactEmail || org?.email;

        if (
          newStatus === "COMPLETED" &&
          NOTIFICATION_SETTINGS.notifyOperatorOnCompletion
        ) {
          if (phone) {
            sendJobCompletionNotification(phone, refNumber, vendorName).then((r) => {
              if (!r.success) console.error(`[job PATCH] Completion SMS failed:`, r.error);
            });
          }
          if (email && NOTIFICATION_SETTINGS.emailEnabled) {
            sendJobCompletionEmail(email, refNumber, vendorName).then((r) => {
              if (!r.success) console.error(`[job PATCH] Completion email failed:`, r.error);
            });
          }
        } else if (
          (newStatus === "ACCEPTED" || newStatus === "IN_PROGRESS") &&
          NOTIFICATION_SETTINGS.notifyOperatorOnStatusChange
        ) {
          if (phone) {
            sendOperatorStatusUpdate(phone, refNumber, newStatus, vendor?.companyName).then((r) => {
              if (!r.success) console.error(`[job PATCH] Status SMS failed:`, r.error);
            });
          }
          if (email && NOTIFICATION_SETTINGS.emailEnabled) {
            sendOperatorStatusEmail(email, refNumber, newStatus, vendor?.companyName).then((r) => {
              if (!r.success) console.error(`[job PATCH] Status email failed:`, r.error);
            });
          }
        }
      })
      .catch((err) => {
        console.error(`[job PATCH] Could not look up org for notifications:`, err);
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
    const { url, photoType, latitude, longitude } = body;
    if (!url) {
      return NextResponse.json({ error: "url is required for photo type" }, { status: 400 });
    }

    const photo = await prisma.jobPhoto.create({
      data: {
        jobId: id,
        url,
        type: photoType ?? "DURING",
      },
    });

    return NextResponse.json(photo, { status: 201 });
  }
}
