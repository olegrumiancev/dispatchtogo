import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Statuses that are considered "open/active" — the operator must close these before
// disabling or deleting a property.
const ACTIVE_STATUSES = [
  "SUBMITTED",
  "TRIAGING",
  "NEEDS_CLARIFICATION",
  "READY_TO_DISPATCH",
  "DISPATCHED",
  "ACCEPTED",
  "IN_PROGRESS",
];

async function getPropertyForOperator(id: string, orgId: string) {
  return prisma.property.findFirst({ where: { id, organizationId: orgId } });
}

async function countActiveRequests(propertyId: string) {
  return prisma.serviceRequest.count({
    where: { propertyId, status: { in: ACTIVE_STATUSES } },
  });
}

/** PATCH /api/properties/[id]  — toggle isActive */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "OPERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const orgId: string = user.organizationId;

  const property = await getPropertyForOperator(id, orgId);
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // Only block when trying to DISABLE (not when re-enabling)
  if (property.isActive) {
    const activeCount = await countActiveRequests(id);
    if (activeCount > 0) {
      return NextResponse.json(
        {
          error: `This property has ${activeCount} active service request${activeCount !== 1 ? "s" : ""}. Please close them out before disabling the property.`,
          activeRequestCount: activeCount,
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { isActive: !property.isActive },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/properties/[id]  — hard delete */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "OPERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const orgId: string = user.organizationId;

  const property = await getPropertyForOperator(id, orgId);
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const activeCount = await countActiveRequests(id);
  if (activeCount > 0) {
    return NextResponse.json(
      {
        error: `This property has ${activeCount} active service request${activeCount !== 1 ? "s" : ""}. Please close them out before deleting the property.`,
        activeRequestCount: activeCount,
      },
      { status: 409 }
    );
  }

  await prisma.property.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
