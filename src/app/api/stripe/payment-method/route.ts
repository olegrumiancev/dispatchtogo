/**
 * DELETE /api/stripe/payment-method
 *
 * Detaches the operator's stored payment method from Stripe and clears
 * all card-related fields on the Organization. The org remains on its
 * current plan. If it is on FREE and the gate threshold is later reached,
 * new requests will be held again.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureOrganizationIsActiveForMutation } from "@/lib/organization-lifecycle";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "OPERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: "No organization linked to user" }, { status: 400 });
  const guard = await ensureOrganizationIsActiveForMutation(user.organizationId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: { stripePaymentMethodId: true, stripeCustomerId: true },
  });

  if (!org.stripePaymentMethodId) {
    return NextResponse.json({ error: "No payment method on file" }, { status: 400 });
  }

  // Detach from Stripe
  try {
    await stripe.paymentMethods.detach(org.stripePaymentMethodId);
  } catch (err) {
    console.error("[payment-method] Failed to detach from Stripe:", err);
    // Continue — still clear our own DB record
  }

  // Unset default payment method on the Stripe customer
  if (org.stripeCustomerId) {
    try {
      await stripe.customers.update(org.stripeCustomerId, {
        invoice_settings: { default_payment_method: "" },
      });
    } catch (err) {
      console.error("[payment-method] Failed to unset Stripe customer default PM:", err);
    }
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      hasPaymentMethod: false,
      stripePaymentMethodId: null,
      stripeCardBrand: null,
      stripeCardLast4: null,
      stripeCardExpMonth: null,
      stripeCardExpYear: null,
    },
  });

  return NextResponse.json({ success: true });
}
