import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_AVAILABILITY_STATUSES = ["AVAILABLE", "BUSY", "OFF_DUTY"] as const;
import { SERVICE_CATEGORIES } from "@/lib/constants";

// GET /api/vendors/[id] — fetch vendor profile (own only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { id } = await params;

  // Vendor can only fetch their own profile; admin can fetch any
  if (user.role !== "ADMIN" && user.vendorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      skills: true,
      credentials: true,
    },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json(vendor);
}

// PATCH /api/vendors/[id] — update vendor profile fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { id } = await params;

  // Vendor can only update their own profile; admin can update any
  if (user.role !== "ADMIN" && user.vendorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only allow specific fields to be updated
  const { companyName, contactName, phone, address, serviceRadiusKm, availabilityStatus, availabilityNote, categories } = body;

  const updateData: Record<string, any> = {};
  if (companyName !== undefined) updateData.companyName = String(companyName).trim();
  if (contactName !== undefined) updateData.contactName = String(contactName).trim();
  if (phone !== undefined) updateData.phone = String(phone).trim();
  if (address !== undefined) updateData.address = address ? String(address).trim() : null;
  if (serviceRadiusKm !== undefined) {
    const radius = parseInt(serviceRadiusKm, 10);
    if (!isNaN(radius) && radius > 0) updateData.serviceRadiusKm = radius;
  }

  if (availabilityStatus !== undefined) {
    if (!VALID_AVAILABILITY_STATUSES.includes(availabilityStatus)) {
      return NextResponse.json(
        { error: `Invalid availability status. Must be one of: ${VALID_AVAILABILITY_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    updateData.availabilityStatus = availabilityStatus;
    // Clear note if going back to AVAILABLE
    if (availabilityStatus === "AVAILABLE") {
      updateData.availabilityNote = null;
    }
  }
  if (availabilityNote !== undefined) {
    updateData.availabilityNote = availabilityNote ? String(availabilityNote).trim() : null;
  }

  let validatedCategories: string[] | undefined;
  if (categories !== undefined) {
    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: "categories must be an array" }, { status: 400 });
    }
    const allowedCategories = new Set<string>(SERVICE_CATEGORIES.map((c) => c.value));
    validatedCategories = Array.from(
      new Set(
        categories
          .filter((c) => typeof c === "string")
          .map((c) => c.trim())
          .filter((c) => c.length > 0 && allowedCategories.has(c))
      )
    );

    if (validatedCategories.length === 0) {
      return NextResponse.json(
        { error: "At least one valid category is required" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(updateData).length === 0 && validatedCategories === undefined) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (validatedCategories !== undefined) {
      await tx.vendorSkill.deleteMany({ where: { vendorId: id } });
      await tx.vendorSkill.createMany({
        data: validatedCategories.map((category) => ({ vendorId: id, category })),
      });
    }

    return tx.vendor.update({
      where: { id },
      data: updateData,
      include: { skills: true },
    });
  });

  return NextResponse.json(updated);
}
