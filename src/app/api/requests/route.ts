import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureOrganizationIsActiveForMutation } from "@/lib/organization-lifecycle";
import { prisma } from "@/lib/prisma";
import { generateReferenceNumber } from "@/lib/utils";
import { autoDispatch } from "@/lib/auto-dispatch";
import { isOrgPaymentGated } from "@/lib/billing";
import {
  triageServiceRequest,
  storePreClassification,
  type PreClassificationData,
} from "@/lib/ai-triage";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const propertyId = searchParams.get("propertyId");

  const where: any = {};

  if (user.role === "OPERATOR") {
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
    }
    where.organizationId = user.organizationId;
  } else if (user.role === "VENDOR") {
    if (!user.vendorId) {
      return NextResponse.json({ error: "No vendor linked to user" }, { status: 400 });
    }
    where.job = { vendorId: user.vendorId };
  }

  if (status) {
    where.status = status;
  }

  if (propertyId) {
    where.propertyId = propertyId;
  }

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: {
      property: true,
      job: {
        include: { vendor: true },
      },
      invoice: true,
      photos: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "OPERATOR") {
    return NextResponse.json(
      { error: "Only OPERATORs can submit service requests" },
      { status: 403 }
    );
  }

  if (!user.organizationId) {
    return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
  }
  const guard = await ensureOrganizationIsActiveForMutation(user.organizationId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json();
  const {
    propertyId,
    description,
    category,
    urgency,
    aiClassification,
    photoUrls,
    preferredVendorId,
  } = body;

  if (!propertyId || !description || !category) {
    return NextResponse.json(
      { error: "propertyId, description, and category are required" },
      { status: 400 }
    );
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: user.organizationId },
  });

  if (!property) {
    return NextResponse.json(
      { error: "Property not found or not accessible" },
      { status: 404 }
    );
  }

  const referenceNumber = generateReferenceNumber("SR");

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      organizationId: user.organizationId,
      propertyId,
      description,
      category,
      urgency: urgency ?? "MEDIUM",
      referenceNumber,
      status: "SUBMITTED",
    },
    include: {
      property: true,
    },
  });

  if (Array.isArray(photoUrls) && photoUrls.length > 0) {
    await prisma.photo.createMany({
      data: photoUrls.map((url: string) => ({
        serviceRequestId: serviceRequest.id,
        url,
        type: "INTAKE",
      })),
    });
  }

  let triageResult: Awaited<ReturnType<typeof triageServiceRequest>> | null = null;
  try {
    if (aiClassification) {
      triageResult = await storePreClassification(
        serviceRequest.id,
        aiClassification as PreClassificationData
      );
    } else {
      triageResult = await triageServiceRequest(serviceRequest.id);
    }
  } catch (err) {
    console.error("[ai-triage] Error:", err);
  }

  const needsClarification =
    triageResult?.statusSuggestion === "NEEDS_CLARIFICATION";

  let paymentRequired = false;
  if (needsClarification) {
    await prisma.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: { status: "NEEDS_CLARIFICATION" },
    });
  } else {
    const paymentGated = await isOrgPaymentGated(user.organizationId);

    if (paymentGated) {
      await prisma.serviceRequest.update({
        where: { id: serviceRequest.id },
        data: { status: "READY_TO_DISPATCH" },
      });
      paymentRequired = true;
    } else {
      try {
        await autoDispatch(serviceRequest.id, preferredVendorId || null);
      } catch (err) {
        console.error("[auto-dispatch] Error:", err);
      }
    }
  }

  const updated = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequest.id },
    include: {
      property: true,
      job: { include: { vendor: true } },
      aiClassifications: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  const responseBody = updated ?? serviceRequest;
  return NextResponse.json(
    { ...responseBody, paymentRequired },
    { status: 201 }
  );
}
