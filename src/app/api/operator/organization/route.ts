import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureOrganizationIsActiveForMutation } from "@/lib/organization-lifecycle";
import { prisma } from "@/lib/prisma";
import { getOrganizationTypes } from "@/lib/catalog";

// GET /api/operator/organization — fetch the operator's own organization
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "OPERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: "No organization linked" }, { status: 400 });

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      id: true,
      name: true,
      type: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
    },
  });

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json(org);
}

// PATCH /api/operator/organization — update the operator's own organization
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "OPERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: "No organization linked" }, { status: 400 });

  const guard = await ensureOrganizationIsActiveForMutation(user.organizationId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await request.json();
  const { name, type, contactEmail, contactPhone, address } = body;
  const allowedTypes = new Set<string>((await getOrganizationTypes()).map((t) => t.value));

  const data: Record<string, any> = {};

  if (typeof name === "string" && name.trim()) {
    data.name = name.trim();
  }
  if (typeof type === "string" && allowedTypes.has(type)) {
    data.type = type;
  }
  if (typeof contactEmail === "string") {
    data.contactEmail = contactEmail.trim() || null;
    data.email = contactEmail.trim() || null;
  }
  if (typeof contactPhone === "string") {
    data.contactPhone = contactPhone.trim() || null;
    data.phone = contactPhone.trim() || null;
  }
  if (typeof address === "string") {
    data.address = address.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: user.organizationId },
    data,
    select: {
      id: true,
      name: true,
      type: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
    },
  });

  return NextResponse.json(updated);
}
