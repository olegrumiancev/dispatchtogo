/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for the logged-in operator.
 * Returns { url } for client-side redirect.
 *
 * Pre-requisite: The Customer Portal must be activated once in the Stripe
 * Dashboard → Settings → Billing → Customer Portal before this works.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "OPERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: { stripeCustomerId: true },
  });

  if (!org.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer found. Add a payment method first." }, { status: 400 });
  }

  const appBase =
    process.env.APP_BASE_URL ??
    (process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL : "http://localhost:3000");

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appBase}/app/operator/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
