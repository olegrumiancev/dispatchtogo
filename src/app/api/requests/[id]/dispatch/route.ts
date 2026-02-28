import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import { sendVendorDispatchNotification } from "@/lib/sms";

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
    return NextResponse.json({ error: "Forbidden: only ADMINs can dispatch requests" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { vendorId } = body;

  if (!vendorId) {
    return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
  }

  // Fetch service request
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  // Ensure not already dispatched with an active job
  if (serviceRequest.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cannot dispatch a cancelled request" },
      { status: 400 }
    );
  }

  const existingJob = await prisma.job.findUnique({
    where: { serviceRequestId: id },
  });
  if (existingJob) {
    return NextResponse.json(
      { error: "This request already has a job assigned" },
      { status: 409 }
    );
  }

  // Verify vendor exists
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Create job and update request status in a transaction
  const [job] = await prisma.$transaction([
    prisma.job.create({
      data: {
        serviceRequestId: id,
        vendorId,
        organizationId: serviceRequest.organizationId,
      },
      include: {
        vendor: true,
        serviceRequest: {
          include: { property: true },
        },
      },
    }),
    prisma.serviceRequest.update({
      where: { id },
      data: { status: "DISPATCHED" },
    }),
  ]);

  // Fire-and-forget SMS to vendor
  if (NOTIFICATION_SETTINGS.notifyVendorOnDispatch) {
    const property = (job.serviceRequest as any).property;
    Promise.resolve(
      sendVendorDispatchNotification(vendor.phone, vendor.companyName, {
        category: serviceRequest.category,
        propertyName: property?.name ?? "Unknown Property",
        urgency: serviceRequest.urgency,
        description: serviceRequest.description,
        refNumber: serviceRequest.referenceNumber,
      })
    ).then((result) => {
      if (!result.success) {
        console.error(
          `[dispatch] SMS to vendor ${vendor.companyName} failed:`,
          result.error
        );
      }
    });
  }

  return NextResponse.json(job, { status: 201 });
}
