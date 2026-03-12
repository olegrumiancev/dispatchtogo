import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateDispatchAssist } from "@/lib/ai-assist";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import { sendVendorDispatchNotification } from "@/lib/sms";
import { sendVendorDispatchEmail } from "@/lib/email";
import { SERVICE_CATEGORIES } from "@/lib/constants";

function getCategoryLabel(category: string) {
  return (
    SERVICE_CATEGORIES.find((entry) => entry.value === category)?.label ?? category
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: only ADMINs can dispatch requests" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const { vendorId } = body;

  if (!vendorId) {
    return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
  }

  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!serviceRequest) {
    return NextResponse.json(
      { error: "Service request not found" },
      { status: 404 }
    );
  }

  if (serviceRequest.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cannot dispatch a cancelled request" },
      { status: 400 }
    );
  }

  if (serviceRequest.status === "NEEDS_CLARIFICATION") {
    return NextResponse.json(
      { error: "This request needs clarification before it can be dispatched" },
      { status: 409 }
    );
  }

  const existingJob = await prisma.job.findFirst({
    where: {
      serviceRequestId: id,
      status: { not: "DECLINED" },
    },
  });
  if (existingJob) {
    return NextResponse.json(
      { error: "This request already has a job assigned" },
      { status: 409 }
    );
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }
  if (vendor.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "This vendor is not active and cannot receive new dispatches." },
      { status: 409 }
    );
  }

  const declinedJob = await prisma.job.findFirst({
    where: { serviceRequestId: id, status: "DECLINED" },
  });

  const jobInclude = {
    vendor: true,
    serviceRequest: {
      include: { property: true },
    },
  };

  const [job] = await prisma.$transaction([
    declinedJob
      ? prisma.job.update({
          where: { id: declinedJob.id },
          data: {
            vendorId,
            status: "OFFERED",
            acceptedAt: null,
            enRouteAt: null,
            arrivedAt: null,
            completedAt: null,
            declineReason: null,
            isPaused: false,
            pauseReason: null,
            pausedAt: null,
            estimatedReturnDate: null,
            quoteDisposition: null,
            quoteDispositionAt: null,
            quoteDispositionNote: null,
            vendorNotes: null,
          },
          include: jobInclude,
        })
      : prisma.job.create({
          data: {
            serviceRequestId: id,
            vendorId,
            organizationId: serviceRequest.organizationId,
          },
          include: jobInclude,
        }),
    prisma.serviceRequest.update({
      where: { id },
      data: { status: "DISPATCHED" },
    }),
  ]);

  if (NOTIFICATION_SETTINGS.notifyVendorOnDispatch) {
    const property = (job.serviceRequest as any).property;
    const categoryLabel = getCategoryLabel(serviceRequest.category);
    const propertyName = property?.name ?? "Assigned property";
    const details = {
      category: serviceRequest.category,
      propertyName: property?.name ?? "Unknown Property",
      urgency: serviceRequest.urgency,
      description: serviceRequest.description,
      refNumber: serviceRequest.referenceNumber,
    };

    sendVendorDispatchNotification(
      vendor.phone,
      vendor.companyName,
      details
    ).then((result) => {
      if (!result.success) {
        console.error(
          `[dispatch] SMS to vendor ${vendor.companyName} failed:`,
          result.error
        );
      }
    });

    if (NOTIFICATION_SETTINGS.emailEnabled) {
      sendVendorDispatchEmail(
        vendor.email,
        vendor.companyName,
        details
      ).then((result) => {
        if (!result.success) {
          console.error(
            `[dispatch] Email to vendor ${vendor.companyName} failed:`,
            result.error
          );
        }
      });
    }

    prisma.user
      .findMany({ where: { vendorId: vendor.id }, select: { id: true } })
      .then((vendorUsers) => {
        if (!vendorUsers.length) return;
        return prisma.notification.createMany({
          data: vendorUsers.map((account) => ({
            userId: account.id,
            title: "New job waiting",
            body: `${serviceRequest.referenceNumber} | ${propertyName} | ${categoryLabel}. Review and accept or pass.`,
            type: "JOB_DISPATCHED",
            link: `/app/vendor/jobs/${job.id}`,
            metadata: {
              referenceNumber: serviceRequest.referenceNumber,
              propertyName,
              category: serviceRequest.category,
              categoryLabel,
              jobId: job.id,
            },
          })),
        });
      })
      .catch((error) =>
        console.error("[dispatch] In-app notification failed:", error)
      );
  }

  generateDispatchAssist(id, vendorId).catch((error) => {
    console.error("[dispatch] Failed to persist dispatch handoff assist:", error);
  });

  return NextResponse.json(job, { status: 201 });
}
