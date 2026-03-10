import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  VENDOR_ACTIVE_WORK_JOB_STATUSES,
  VENDOR_RELEASEABLE_JOB_STATUSES,
} from "@/lib/vendor-lifecycle";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { vendorId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 1000)
      : null;

  if (!["suspend", "reactivate", "offboard"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      companyName: true,
      status: true,
    },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  if (action === "reactivate") {
    if (vendor.status === "OFFBOARDED") {
      return NextResponse.json(
        { error: "Offboarded vendors cannot be reactivated." },
        { status: 409 }
      );
    }

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: "ACTIVE",
        suspendedAt: null,
        statusReason: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "VENDOR",
        entityId: vendorId,
        action: "VENDOR_REACTIVATED",
        userId: user.id,
        metadata: { reason },
      },
    });

    return NextResponse.json(updated);
  }

  if (vendor.status === "OFFBOARDED") {
    return NextResponse.json(
      { error: "Offboarded vendors cannot be changed." },
      { status: 409 }
    );
  }

  const [offeredJobs, activeWorkJobs, disputedRequests] = await Promise.all([
    prisma.job.findMany({
      where: {
        vendorId,
        status: { in: [...VENDOR_RELEASEABLE_JOB_STATUSES] },
      },
      select: { id: true, serviceRequestId: true },
    }),
    prisma.job.count({
      where: {
        vendorId,
        status: { in: [...VENDOR_ACTIVE_WORK_JOB_STATUSES] },
      },
    }),
    prisma.serviceRequest.count({
      where: {
        status: "DISPUTED",
        job: { is: { vendorId } },
      },
    }),
  ]);

  if (activeWorkJobs > 0 || (action === "offboard" && disputedRequests > 0)) {
    return NextResponse.json(
      {
        error:
          action === "offboard"
            ? "Vendor cannot be offboarded until active work and disputed jobs are resolved."
            : "Vendor cannot be suspended until active work is resolved.",
        checks: {
          activeWorkJobs,
          disputedRequests,
          offeredJobs: offeredJobs.length,
        },
      },
      { status: 409 }
    );
  }

  const now = new Date();
  const defaultReason =
    action === "offboard"
      ? `Vendor offboarded by admin on ${now.toLocaleDateString("en-CA")}`
      : `Vendor suspended by admin on ${now.toLocaleDateString("en-CA")}`;
  const lifecycleReason = reason ?? defaultReason;
  const offeredJobIds = offeredJobs.map((job) => job.id);
  const offeredRequestIds = offeredJobs.map((job) => job.serviceRequestId);

  const updated = await prisma.$transaction(async (tx) => {
    if (offeredJobIds.length > 0) {
      await tx.job.updateMany({
        where: { id: { in: offeredJobIds } },
        data: {
          status: "DECLINED",
          declineReason: lifecycleReason,
        },
      });

      await tx.serviceRequest.updateMany({
        where: {
          id: { in: offeredRequestIds },
          status: "DISPATCHED",
        },
        data: { status: "READY_TO_DISPATCH" },
      });
    }

    if (action === "offboard") {
      await tx.user.updateMany({
        where: {
          vendorId,
          role: "VENDOR",
        },
        data: {
          isDisabled: true,
          disabledAt: now,
        },
      });

      await tx.preferredVendor.deleteMany({
        where: { vendorId },
      });
    }

    const nextVendor = await tx.vendor.update({
      where: { id: vendorId },
      data: {
        status: action === "offboard" ? "OFFBOARDED" : "SUSPENDED",
        suspendedAt: now,
        offboardedAt: action === "offboard" ? now : null,
        statusReason: lifecycleReason,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "VENDOR",
        entityId: vendorId,
        action: action === "offboard" ? "VENDOR_OFFBOARDED" : "VENDOR_SUSPENDED",
        userId: user.id,
        metadata: {
          reason: lifecycleReason,
          releasedOfferedJobs: offeredJobIds.length,
          removedPreferredVendorMappings: action === "offboard",
        },
      },
    });

    return nextVendor;
  });

  return NextResponse.json(updated);
}
