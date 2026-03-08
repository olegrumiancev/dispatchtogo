import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BILLING_PLANS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "OPERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!user.organizationId) {
    return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
  }

  const body = await request.json();
  const { plan } = body;

  if (!plan || !BILLING_PLANS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: { plan: true, hasPaymentMethod: true },
  });

  if (org.plan === plan) {
    return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
  }

  // Require a payment method before upgrading to any paid plan
  if (!org.hasPaymentMethod) {
    return NextResponse.json(
      { error: "Payment method required", requiresPaymentMethod: true },
      { status: 402 }
    );
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { plan, planUpdatedAt: new Date() },
  });

  return NextResponse.json({ success: true, plan });
}
