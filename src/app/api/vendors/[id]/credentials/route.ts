import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = [
  "TRADE_LICENSE",
  "WSIB",
  "INSURANCE_COI",
  "BUSINESS_LICENSE",
  "OTHER",
] as const;

// POST /api/vendors/[id]/credentials — add a new credential
export async function POST(
  req: NextRequest,
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, credentialNumber, expiresAt } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!credentialNumber || String(credentialNumber).trim() === "") {
    return NextResponse.json(
      { error: "credentialNumber is required" },
      { status: 400 }
    );
  }

  let expiresAtDate: Date | undefined;
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid expiresAt date" },
        { status: 400 }
      );
    }
  }

  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const credential = await prisma.vendorCredential.create({
    data: {
      vendorId: id,
      type: String(type),
      credentialNumber: String(credentialNumber).trim(),
      expiresAt: expiresAtDate ?? null,
      verified: false,
    },
  });

  return NextResponse.json(credential, { status: 201 });
}

// DELETE /api/vendors/[id]/credentials — delete a credential
export async function DELETE(
  req: NextRequest,
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { credentialId } = body;

  if (!credentialId || String(credentialId).trim() === "") {
    return NextResponse.json(
      { error: "credentialId is required" },
      { status: 400 }
    );
  }

  const credential = await prisma.vendorCredential.findUnique({
    where: { id: credentialId },
  });

  if (!credential) {
    return NextResponse.json(
      { error: "Credential not found" },
      { status: 404 }
    );
  }

  if (credential.vendorId !== id) {
    return NextResponse.json(
      { error: "Credential does not belong to this vendor" },
      { status: 403 }
    );
  }

  await prisma.vendorCredential.delete({ where: { id: credentialId } });

  return NextResponse.json({ success: true });
}
