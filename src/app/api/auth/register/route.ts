import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, organizationName, companyName, phone } = body;

    // Validation
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "email, password, and role are required" },
        { status: 400 }
      );
    }

    if (!["OPERATOR", "VENDOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check for existing email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let user;

    if (role === "OPERATOR") {
      if (!organizationName) {
        return NextResponse.json(
          { error: "organizationName is required for OPERATOR role" },
          { status: 400 }
        );
      }

      // Create Organization first, then User
      const organization = await prisma.organization.create({
        data: {
          name: organizationName,
          contactEmail: email,
          contactPhone: phone ?? null,
        },
      });

      user = await prisma.user.create({
        data: {
          name: name ?? null,
          email,
          passwordHash,
          role: "OPERATOR",
          organizationId: organization.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          vendorId: true,
          createdAt: true,
        },
      });
    } else if (role === "VENDOR") {
      if (!companyName) {
        return NextResponse.json(
          { error: "companyName is required for VENDOR role" },
          { status: 400 }
        );
      }

      // Create Vendor first, then User
      const vendor = await prisma.vendor.create({
        data: {
          companyName,
          contactName: name ?? companyName,
          email,
          phone: phone ?? "",
        },
      });

      user = await prisma.user.create({
        data: {
          name: name ?? null,
          email,
          passwordHash,
          role: "VENDOR",
          vendorId: vendor.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          vendorId: true,
          createdAt: true,
        },
      });
    } else {
      // ADMIN
      user = await prisma.user.create({
        data: {
          name: name ?? null,
          email,
          passwordHash,
          role: "ADMIN",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          vendorId: true,
          createdAt: true,
        },
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
