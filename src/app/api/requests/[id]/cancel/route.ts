import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRE_DISPATCH_STATUSES = ["SUBMITTED", "TRIAGING", "NEEDS_CLARIFICATION", "READY_TO_DISPATCH"];

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

  const current = await prisma.serviceRequest.findFirst({ where });
  if (!current) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  if (!PRE_DISPATCH_STATUSES.includes(current.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a request with status "${current.status}". Only pre-dispatch requests can be cancelled by operators.` },
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

  return NextResponse.json(updated);
}
