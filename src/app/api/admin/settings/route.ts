import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();

  // Whitelist the fields that can be updated
  const BOOLEAN_FIELDS = [
    "emailVerification",
    "emailPasswordReset",
    "emailNewRegistration",
    "emailAccountApproved",
    "emailAccountRejected",
    "emailVendorDispatch",
    "emailOperatorStatusUpdate",
    "emailJobCompletion",
    "emailVendorRejection",
    "emailAdminRejection",
    "emailWelcome",
    "bccEnabled",
  ] as const;

  const STRING_FIELDS = ["bccAddresses"] as const;

  const data: Record<string, any> = {};

  for (const key of BOOLEAN_FIELDS) {
    if (typeof body[key] === "boolean") {
      data[key] = body[key];
    }
  }
  for (const key of STRING_FIELDS) {
    if (typeof body[key] === "string") {
      data[key] = body[key];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  return NextResponse.json(updated);
}
