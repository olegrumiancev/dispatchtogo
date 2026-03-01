import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/vendors/available?category=PLUMBING&propertyId=xxx
 *
 * Returns active vendors that match the given category (via VendorSkill).
 * Also flags which vendor is the preferred one for the operator's
 * org / property combination, if any.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!user.organizationId) {
    return NextResponse.json({ error: "No organization linked" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const propertyId = searchParams.get("propertyId");

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const catNorm = norm(category);

  // Fetch all active vendors with skills
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    include: { skills: true },
  });

  const matching = vendors
    .filter((v) => v.skills.some((s) => norm(s.category) === catNorm))
    .map((v) => ({
      id: v.id,
      companyName: v.companyName,
      contactName: v.contactName,
      serviceArea: v.serviceArea,
    }));

  // Find preferred vendor(s) for this org + property/category
  let preferredVendorId: string | null = null;

  if (propertyId) {
    const propPref = await prisma.preferredVendor.findFirst({
      where: { organizationId: user.organizationId, propertyId },
    });
    if (propPref && norm(propPref.category) === catNorm) {
      preferredVendorId = propPref.vendorId;
    }
  }

  if (!preferredVendorId) {
    const orgPref = await prisma.preferredVendor.findFirst({
      where: { organizationId: user.organizationId, propertyId: null },
    });
    if (orgPref && norm(orgPref.category) === catNorm) {
      preferredVendorId = orgPref.vendorId;
    }
  }

  return NextResponse.json({ vendors: matching, preferredVendorId });
}
