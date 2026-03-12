import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      organization: {
        select: {
          name: true,
        },
      },
      vendor: {
        select: {
          companyName: true,
        },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(account);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const body = await request.json().catch(() => null);

  if (!body || (!("name" in body))) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  if (body.name !== null && typeof body.name !== "string") {
    return NextResponse.json({ error: "name must be a string or null" }, { status: 400 });
  }

  const nextName =
    typeof body.name === "string"
      ? body.name.trim().slice(0, 100) || null
      : null;

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: nextName,
    },
    select: {
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (existing.name !== nextName) {
    await writeAuditLog({
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      action: AUDIT_ACTIONS.ACCOUNT_NAME_UPDATED,
      actorUserId: user.id,
      metadata: {
        previousName: existing.name,
        nextName,
      },
    });
  }

  return NextResponse.json(updated);
}
