import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triageServiceRequest } from "@/lib/ai-triage";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: only ADMINs can trigger triage" }, { status: 403 });
  }

  const body = await request.json();
  const { serviceRequestId } = body;

  if (!serviceRequestId) {
    return NextResponse.json({ error: "serviceRequestId is required" }, { status: 400 });
  }

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: {
      property: true,
      category: true,
    },
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  const triageResult = await triageServiceRequest({
    description: serviceRequest.description,
    category: serviceRequest.category.name,
    urgency: serviceRequest.urgency as string,
    propertyType: (serviceRequest.property as any)?.type ?? "unknown",
  });

  // Store triage result as an AiClassification record and update status to TRIAGED
  const [classification, updated] = await prisma.$transaction([
    prisma.aiClassification.create({
      data: {
        requestId: serviceRequestId,
        suggestedCategoryId: serviceRequest.categoryId,
        confidence: triageResult.urgencyScore / 10,
        reasoning: triageResult.summary,
      },
    }),
    prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: {
        status: "TRIAGED",
      },
    }),
  ]);

  return NextResponse.json({
    serviceRequest: updated,
    triage: triageResult,
    classification,
  });
}
