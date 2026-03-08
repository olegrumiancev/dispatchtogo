import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/billing";

export const runtime = "nodejs";

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

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
  });

  // Record billing terms acceptance at click time (before Stripe redirect)
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    null;

  await prisma.organization.update({
    where: { id: org.id },
    data: { billingTermsAcceptedAt: new Date() },
  });

  const customerId = await ensureStripeCustomer(org);

  const appBase =
    process.env.APP_BASE_URL ??
    (process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL
      : "http://localhost:3000");

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    currency: "cad",
    success_url: `${appBase}/app/operator/billing?setup=success`,
    cancel_url: `${appBase}/app/operator/billing?setup=cancelled`,
    metadata: {
      organizationId: org.id,
      clientIp: clientIp ?? "",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
