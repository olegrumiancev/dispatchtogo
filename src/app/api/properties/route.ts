import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = (session.user as any).organizationId as string;

  const properties = await prisma.property.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = (session.user as any).organizationId as string;

  let body: { name?: string; address?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, address, description } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!address || typeof address !== "string" || address.trim() === "") {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const property = await prisma.property.create({
    data: {
      name: name.trim(),
      address: address.trim(),
      description: description?.trim() || null,
      organizationId: orgId,
    },
  });

  return NextResponse.json(property, { status: 201 });
}
