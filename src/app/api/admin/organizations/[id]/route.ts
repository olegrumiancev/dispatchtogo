import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, writeAuditLog } from "@/lib/audit-log";
import { ORG_PRE_DISPATCH_STATUSES } from "@/lib/organization-lifecycle";
import { prisma } from "@/lib/prisma";
import { getOrganizationTypes } from "@/lib/catalog";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { type, name, contactEmail, contactPhone, address } = body;
  const allowedTypes = new Set<string>((await getOrganizationTypes()).map((t) => t.value));

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const data: Record<string, any> = {};

  if (typeof type === "string" && allowedTypes.has(type)) {
    data.type = type;
  }
  if (typeof name === "string" && name.trim()) {
    data.name = name.trim();
  }
  if (typeof contactEmail === "string") {
    data.contactEmail = contactEmail.trim() || null;
  }
  if (typeof contactPhone === "string") {
    data.contactPhone = contactPhone.trim() || null;
  }
  if (typeof address === "string") {
    data.address = address.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id },
    data,
  });

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

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 1000)
      : null;

  if (!["suspend", "reactivate", "offboard"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (action === "reactivate") {
    if (org.status === "OFFBOARDED") {
      return NextResponse.json(
        { error: "Offboarded organizations cannot be reactivated." },
        { status: 409 }
      );
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        status: "ACTIVE",
        suspendedAt: null,
        statusReason: null,
      },
    });

    await writeAuditLog({
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: id,
      action: AUDIT_ACTIONS.ORG_REACTIVATED,
      actorUserId: user.id,
      metadata: { reason },
    });

    return NextResponse.json(updated);
  }

  if (action === "suspend") {
    if (org.status === "OFFBOARDED") {
      return NextResponse.json(
        { error: "Offboarded organizations cannot be suspended." },
        { status: 409 }
      );
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
        statusReason: reason,
      },
    });

    await writeAuditLog({
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: id,
      action: AUDIT_ACTIONS.ORG_SUSPENDED,
      actorUserId: user.id,
      metadata: { reason },
    });

    return NextResponse.json(updated);
  }

  const [activeJobs, disputedRequests, openPlatformBills] = await Promise.all([
    prisma.job.count({
      where: {
        organizationId: id,
        status: { in: ["OFFERED", "ACCEPTED", "IN_PROGRESS"] },
      },
    }),
    prisma.serviceRequest.count({
      where: { organizationId: id, status: "DISPUTED" },
    }),
    prisma.platformBill.count({
      where: {
        organizationId: id,
        status: { in: ["DRAFT", "SENT", "PAST_DUE"] },
      },
    }),
  ]);

  if (activeJobs > 0 || disputedRequests > 0 || openPlatformBills > 0) {
    return NextResponse.json(
      {
        error:
          "Organization cannot be offboarded until active jobs, disputes, and open platform bills are resolved.",
        checks: {
          activeJobs,
          disputedRequests,
          openPlatformBills,
        },
      },
      { status: 409 }
    );
  }

  const now = new Date();
  const offboardReason =
    reason ?? `Organization offboarded by admin on ${now.toLocaleDateString("en-CA")}`;

  const updated = await prisma.$transaction(async (tx) => {
    const nextOrg = await tx.organization.update({
      where: { id },
      data: {
        status: "OFFBOARDED",
        offboardedAt: now,
        statusReason: offboardReason,
        suspendedAt: now,
      },
    });

    await tx.user.updateMany({
      where: {
        organizationId: id,
        role: { not: "ADMIN" },
      },
      data: {
        isDisabled: true,
        disabledAt: now,
      },
    });
    await tx.property.updateMany({
      where: { organizationId: id },
      data: { isActive: false },
    });
    await tx.serviceRequest.updateMany({
      where: {
        organizationId: id,
        status: { in: [...ORG_PRE_DISPATCH_STATUSES] },
      },
      data: {
        status: "CANCELLED",
        rejectionReason: offboardReason,
      },
    });
    await writeAuditLog({
      client: tx,
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: id,
      action: AUDIT_ACTIONS.ORG_OFFBOARDED,
      actorUserId: user.id,
      metadata: {
        reason: offboardReason,
        cancelledPreDispatchRequests: true,
      },
    });

    return nextOrg;
  });

  return NextResponse.json(updated);
}
