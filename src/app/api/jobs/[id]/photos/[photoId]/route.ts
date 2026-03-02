import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, isStorageConfigured } from "@/lib/s3-client";

const LOCKED_STATUSES = ["COMPLETED", "VERIFIED", "CANCELLED"];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "VENDOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: jobId, photoId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { serviceRequest: { select: { status: true } } },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.vendorId !== user.vendorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (LOCKED_STATUSES.includes(job.serviceRequest.status)) {
    return NextResponse.json(
      { error: "Photos cannot be deleted after the job is marked complete." },
      { status: 409 }
    );
  }

  const photo = await prisma.jobPhoto.findFirst({ where: { id: photoId, jobId } });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  // Delete from S3 (best effort — don't fail the request if S3 is unavailable)
  if (isStorageConfigured()) {
    try {
      // URL is /api/photos/<key> — extract the key from the path
      const match = photo.url.match(/^\/api\/photos\/(.+)$/);
      if (match) await deleteFile(match[1]);
    } catch (err) {
      console.error("[job photo DELETE] S3 delete failed (continuing):", err);
    }
  }

  await prisma.jobPhoto.delete({ where: { id: photoId } });

  return NextResponse.json({ success: true });
}
