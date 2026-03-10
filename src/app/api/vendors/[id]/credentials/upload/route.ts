import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCredentialAssist } from "@/lib/ai-assist";
import { prisma } from "@/lib/prisma";
import { isStorageConfigured, uploadFile } from "@/lib/s3-client";
import { ensureVendorIsActiveForMutation } from "@/lib/vendor-lifecycle";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/**
 * POST /api/vendors/[id]/credentials/upload
 * Form fields: file (File), credentialId (string)
 *
 * Uploads a supporting document (scan, PDF) for a credential and stores the
 * URL on the VendorCredential record. Accessible by the owning vendor and
 * admins.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { id } = await params;

  if (user.role !== "ADMIN" && user.vendorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "VENDOR") {
    const guard = await ensureVendorIsActiveForMutation(id);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Document storage is not configured" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const credentialId = formData.get("credentialId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!credentialId) {
    return NextResponse.json(
      { error: "credentialId is required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: JPEG, PNG, WEBP, PDF` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB" },
      { status: 413 }
    );
  }

  const credential = await prisma.vendorCredential.findUnique({
    where: { id: credentialId },
  });

  if (!credential || credential.vendorId !== id) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.type === "application/pdf" ? "pdf" : file.name.split(".").pop() ?? "jpg";
  const key = `credentials/${id}/${crypto.randomUUID()}.${ext}`;

  const url = await uploadFile(key, buffer, file.type);

  const updated = await prisma.vendorCredential.update({
    where: { id: credentialId },
    data: { documentUrl: url },
  });

  generateCredentialAssist(updated.id).catch((err) => {
    console.error("[credential-upload] Failed to persist credential assist:", err);
  });

  return NextResponse.json({ url: updated.documentUrl }, { status: 200 });
}
