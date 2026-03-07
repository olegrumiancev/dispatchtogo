import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ vendorId: string; credentialId: string }> };

/**
 * PATCH /api/admin/vendors/[vendorId]/credentials/[credentialId]
 * Body: { verified: boolean }
 *
 * Admin-only. Toggles the verified flag, stamps verifiedAt/verifiedByUserId
 * when verifying, and clears them when un-verifying.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminUser = session.user as any;
  if (adminUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { vendorId, credentialId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.verified !== "boolean") {
    return NextResponse.json(
      { error: "verified (boolean) is required" },
      { status: 400 }
    );
  }

  const credential = await prisma.vendorCredential.findUnique({
    where: { id: credentialId },
  });

  if (!credential) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  if (credential.vendorId !== vendorId) {
    return NextResponse.json(
      { error: "Credential does not belong to this vendor" },
      { status: 403 }
    );
  }

  const updated = await prisma.vendorCredential.update({
    where: { id: credentialId },
    data: {
      verified: body.verified,
      verifiedAt: body.verified ? new Date() : null,
      verifiedByUserId: body.verified ? adminUser.id : null,
    },
  });

  return NextResponse.json(updated);
}
