import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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

  const { photos } = body;

  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json(
      { error: "photos must be a non-empty array" },
      { status: 400 }
    );
  }

  // Validate each photo has a URL
  for (const photo of photos) {
    if (!photo.url) {
      return NextResponse.json(
        { error: "Each photo must have a url" },
        { status: 400 }
      );
    }
  }

  // Verify the service request exists and the user has access
  const where: any = { id };
  if (user.role === "OPERATOR") {
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
    }
    where.organizationId = user.organizationId;
  }

  const serviceRequest = await prisma.serviceRequest.findFirst({ where });
  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  const created = await prisma.photo.createMany({
    data: photos.map((photo: any) => ({
      serviceRequestId: id,
      url: photo.url,
      type: photo.type ?? "INTAKE",
      latitude: photo.latitude ?? null,
      longitude: photo.longitude ?? null,
    })),
  });

  // Fetch the created photos to return them
  const newPhotos = await prisma.photo.findMany({
    where: { serviceRequestId: id },
    orderBy: { takenAt: "desc" },
    take: photos.length,
  });

  return NextResponse.json(newPhotos, { status: 201 });
}
