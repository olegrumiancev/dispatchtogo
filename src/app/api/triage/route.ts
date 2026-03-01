import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triageServiceRequest } from "@/lib/ai-triage";

/**
 * POST /api/triage
 * Admin-only: manually trigger AI triage on an existing service request.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "OPERATOR") {
    return NextResponse.json(
      { error: "Forbidden: only ADMINs and OPERATORs can trigger triage" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { serviceRequestId } = body;

  if (!serviceRequestId) {
    return NextResponse.json(
      { error: "serviceRequestId is required" },
      { status: 400 }
    );
  }

  // Operators are scoped to their own organization
  const where =
    user.role === "OPERATOR"
      ? { id: serviceRequestId, organizationId: user.organizationId as string }
      : { id: serviceRequestId };

  const serviceRequest = await prisma.serviceRequest.findFirst({ where });

  if (!serviceRequest) {
    return NextResponse.json(
      { error: "Service request not found" },
      { status: 404 }
    );
  }

  const triageResult = await triageServiceRequest(serviceRequestId);

  if (!triageResult) {
    return NextResponse.json(
      { error: "AI triage unavailable — check AI_BASE_URL configuration" },
      { status: 503 }
    );
  }

  // Re-fetch with updated AI data
  const updated = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: {
      aiClassifications: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json({
    serviceRequest: updated,
    triage: triageResult,
  });
}
