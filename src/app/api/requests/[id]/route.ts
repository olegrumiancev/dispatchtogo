import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Valid status transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["TRIAGING", "NEEDS_CLARIFICATION", "READY_TO_DISPATCH", "CANCELLED"],
  TRIAGING: ["NEEDS_CLARIFICATION", "READY_TO_DISPATCH", "CANCELLED"],
  NEEDS_CLARIFICATION: ["TRIAGING", "READY_TO_DISPATCH", "CANCELLED"],
  READY_TO_DISPATCH: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["ACCEPTED", "READY_TO_DISPATCH", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "READY_TO_DISPATCH", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["VERIFIED"],
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

  const { status, urgency, description, aiTriageSummary, aiUrgencyScore } = body;

  // Only ADMIN can do status transitions and triage updates
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
