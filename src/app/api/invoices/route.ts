import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferenceNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: any = {};

  if (user.role === "OPERATOR") {
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
    }
    where.organizationId = user.organizationId;
  }
  // ADMIN sees all - no org filter

  if (status) {
    where.status = status;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      serviceRequest: {
        include: { property: true },
      },
      organization: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!["ADMIN", "OPERATOR"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { serviceRequestId, amount } = body;

  if (!serviceRequestId || amount === undefined) {
    return NextResponse.json(
      { error: "serviceRequestId and amount are required" },
      { status: 400 }
    );
  }

  if (typeof amount !== "number" || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
  }

  // Fetch the service request
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  // OPERATOR can only create invoices for their own org
  if (user.role === "OPERATOR" && serviceRequest.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if invoice already exists for this service request
  const existingInvoice = await prisma.invoice.findUnique({
    where: { serviceRequestId },
  });
  if (existingInvoice) {
    return NextResponse.json(
      { error: "An invoice already exists for this service request" },
      { status: 409 }
    );
  }

  const invoiceNumber = generateReferenceNumber("INV");

  const invoice = await prisma.invoice.create({
    data: {
      serviceRequestId,
      organizationId: serviceRequest.organizationId,
      invoiceNumber,
      amount,
      status: "DRAFT",
    },
    include: {
      serviceRequest: {
        include: { property: true },
      },
      organization: true,
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
