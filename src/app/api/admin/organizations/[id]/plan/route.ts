import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BILLING_PLANS } from "@/lib/constants";

/**
 * PATCH /api/admin/organizations/[id]/plan
 * body: { plan: "FREE" | "VALUE" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const plan: string = body.plan;

  if (!plan || !BILLING_PLANS[plan]) {
    return NextResponse.json(
      { error: `Invalid plan. Must be one of: ${Object.keys(BILLING_PLANS).join(", ")}` },
      { status: 400 }
    );
  }

  const org = await prisma.organization.update({
    where: { id },
    data: { plan, planUpdatedAt: new Date() },
    select: { id: true, name: true, plan: true, planUpdatedAt: true },
  });

  return NextResponse.json(org);
}
