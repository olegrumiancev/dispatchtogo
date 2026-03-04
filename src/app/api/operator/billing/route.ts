import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/operator/billing
 * Returns the authenticated operator's past PlatformBills.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role: string; organizationId?: string };
  if (user.role !== "OPERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: "No organization linked" }, { status: 400 });

  const bills = await prisma.platformBill.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { periodStart: "desc" },
  });

  return NextResponse.json(bills);
}
