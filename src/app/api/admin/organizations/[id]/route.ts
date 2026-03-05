import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ORGANIZATION_TYPES } from "@/lib/constants";

const ALLOWED_TYPES = new Set<string>(ORGANIZATION_TYPES.map((t) => t.value));

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { type, name, contactEmail, contactPhone, address } = body;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const data: Record<string, any> = {};

  if (typeof type === "string" && ALLOWED_TYPES.has(type)) {
    data.type = type;
  }
  if (typeof name === "string" && name.trim()) {
    data.name = name.trim();
  }
  if (typeof contactEmail === "string") {
    data.contactEmail = contactEmail.trim() || null;
  }
  if (typeof contactPhone === "string") {
    data.contactPhone = contactPhone.trim() || null;
  }
  if (typeof address === "string") {
    data.address = address.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
