import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProofPacketPdf, ProofPacketData } from "@/lib/proof-packet";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as {
    id: string;
    role: "OPERATOR" | "VENDOR" | "ADMIN";
    organizationId?: string | null;
    vendorId?: string | null;
  };

  const { jobId } = await params;

  // Build where clause based on role
  const jobWhere: Record<string, unknown> = { id: jobId };

  if (user.role === "OPERATOR") {
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
    }
    jobWhere.organizationId = user.organizationId;
  } else if (user.role === "VENDOR") {
    if (!user.vendorId) {
      return NextResponse.json({ error: "No vendor linked to user" }, { status: 400 });
    }
    jobWhere.vendorId = user.vendorId;
  }
  // ADMIN: no additional filter

  const job = await prisma.job.findFirst({
    where: jobWhere,
    include: {
      serviceRequest: {
        include: {
          property: true,
          organization: true,
          photos: true,
        },
      },
      vendor: true,
      photos: true,
      materials: true,
      notes: {
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      proofPacket: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Build the PDF data object
  const req = job.serviceRequest;

  // Combine all photos (request intake + job photos)
  const allPhotos = [
    ...req.photos.map((p) => ({
      url: p.url,
      type: p.type as string,
      takenAt: p.takenAt,
    })),
    ...job.photos.map((p) => ({
      url: p.url,
      type: p.type as string,
      takenAt: p.takenAt,
    })),
  ];

  const pdfData: ProofPacketData = {
    referenceNumber: req.referenceNumber,
    description: req.description,
    category: req.category as string,
    urgency: req.urgency as string,
    submittedAt: req.createdAt,
    resolvedAt: req.resolvedAt,

    propertyName: req.property.name,
    propertyAddress: req.property.address ?? "",

    organizationName: req.organization.name,
    organizationEmail: req.organization.contactEmail ?? "",
    organizationPhone: req.organization.contactPhone ?? "",
    organizationAddress: req.organization.address ?? "",

    jobId: job.id,
    vendorCompanyName: job.vendor.companyName,
    vendorContactName: job.vendor.contactName,
    vendorPhone: job.vendor.phone,
    vendorEmail: job.vendor.email,
    acceptedAt: job.acceptedAt,
    completedAt: job.completedAt,
    enRouteAt: job.enRouteAt,
    arrivedAt: job.arrivedAt,
    totalLabourHours: job.totalLabourHours,
    totalMaterialsCost: job.totalMaterialsCost,
    totalCost: job.totalCost,
    vendorNotes: job.vendorNotes,
    completionSummary: job.completionSummary,

    materials: job.materials.map((m) => ({
      description: m.description,
      quantity: m.quantity,
      unitCost: m.unitCost,
    })),

    photos: allPhotos,

    notes: job.notes.map((n) => ({
      text: n.text,
      authorName: n.author.name ?? n.author.email,
      createdAt: n.createdAt,
    })),

    createdAt: req.createdAt,
    dispatchedAt: job.createdAt,
  };

  // Generate PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = generateProofPacketPdf(pdfData);
  } catch (err) {
    console.error("[proof-packet] PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }

  // Upsert ProofPacket record
  const summary = [
    req.description.slice(0, 120),
    job.completionSummary ? `Completed: ${job.completionSummary.slice(0, 100)}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  try {
    await prisma.proofPacket.upsert({
      where: { jobId: job.id },
      update: {
        generatedAt: new Date(),
        summary,
        pdfUrl: `/api/proof-packets/${job.id}`,
      },
      create: {
        jobId: job.id,
        generatedAt: new Date(),
        summary,
        pdfUrl: `/api/proof-packets/${job.id}`,
      },
    });
  } catch (err) {
    console.error("[proof-packet] DB upsert error:", err);
  }

  const filename = `proof-packet-${req.referenceNumber}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
