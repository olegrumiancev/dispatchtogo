import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferenceNumber } from "@/lib/utils";
import { autoDispatch } from "@/lib/auto-dispatch";

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
  // ADMIN sees all

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

  const body = await request.json();
  const { propertyId, description, category, urgency } = body;

  if (!propertyId || !description || !category) {
    return NextResponse.json(
      { error: "propertyId, description, and category are required" },
      { status: 400 }
    );
  }

  // Verify property belongs to the operator's organization
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

  // Auto-dispatch: try to find a matching vendor and assign automatically
  // Must await on serverless (Vercel) — fire-and-forget won’t survive function teardown
  try {
    await autoDispatch(serviceRequest.id);
  } catch (err) {
    console.error("[auto-dispatch] Error:", err);
  }

  // Re-fetch with updated status after dispatch attempt
  const updated = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequest.id },
    include: {
      property: true,
      job: { include: { vendor: true } },
    },
  });

  return NextResponse.json(updated ?? serviceRequest, { status: 201 });
}
