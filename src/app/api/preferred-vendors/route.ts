import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET  /api/preferred-vendors         → list all for current org
 * POST /api/preferred-vendors         → upsert a preferred vendor
 * DELETE /api/preferred-vendors?id=x  → remove one
 */

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!user.organizationId) {
    return NextResponse.json({ error: "No organization linked" }, { status: 400 });
  }

  const prefs = await prisma.preferredVendor.findMany({
    where: { organizationId: user.organizationId },
    include: {
      vendor: { select: { id: true, companyName: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: [{ property: { name: "asc" } }, { category: "asc" }],
  });

  // Also return the list of properties and vendors the org can use
  const properties = await prisma.property.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    select: { id: true, companyName: true, skills: { select: { category: true } } },
    orderBy: { companyName: "asc" },
  });

  return NextResponse.json({ prefs, properties, vendors });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!user.organizationId) {
    return NextResponse.json({ error: "No organization linked" }, { status: 400 });
  }

  const { propertyId, category, vendorId } = await request.json();

  if (!category || !vendorId) {
    return NextResponse.json(
      { error: "category and vendorId are required" },
      { status: 400 }
    );
  }

  // Upsert: if one already exists for this org+property+category, replace it
  const existing = await prisma.preferredVendor.findFirst({
    where: {
      organizationId: user.organizationId,
      propertyId: propertyId || null,
      category: { equals: category, mode: "insensitive" },
    },
  });

  let pref;
  if (existing) {
    pref = await prisma.preferredVendor.update({
      where: { id: existing.id },
      data: { vendorId },
      include: {
        vendor: { select: { id: true, companyName: true } },
        property: { select: { id: true, name: true } },
      },
    });
  } else {
    pref = await prisma.preferredVendor.create({
      data: {
        organizationId: user.organizationId,
        propertyId: propertyId || null,
        category,
        vendorId,
      },
      include: {
        vendor: { select: { id: true, companyName: true } },
        property: { select: { id: true, name: true } },
      },
    });
  }

  return NextResponse.json(pref, { status: existing ? 200 : 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!user.organizationId) {
    return NextResponse.json({ error: "No organization linked" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Verify it belongs to this org
  const pref = await prisma.preferredVendor.findFirst({
    where: { id, organizationId: user.organizationId },
  });

  if (!pref) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.preferredVendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
