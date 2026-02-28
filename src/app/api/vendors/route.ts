import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!["ADMIN", "OPERATOR"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendors = await prisma.vendor.findMany({
    include: {
      _count: {
        select: { jobs: true },
      },
    },
    orderBy: { companyName: "asc" },
  });

  return NextResponse.json(vendors);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: only ADMINs can create vendors" }, { status: 403 });
  }

  const body = await request.json();
  const { companyName, contactName, email, phone, specialties, serviceArea } = body;

  if (!companyName || !contactName || !email || !phone) {
    return NextResponse.json(
      { error: "companyName, contactName, email, and phone are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.vendor.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A vendor with this email already exists" },
      { status: 409 }
    );
  }

  const vendor = await prisma.vendor.create({
    data: {
      companyName,
      contactName,
      email,
      phone,
      specialties: specialties ?? [],
      serviceArea: serviceArea ?? null,
    },
  });

  return NextResponse.json(vendor, { status: 201 });
}
