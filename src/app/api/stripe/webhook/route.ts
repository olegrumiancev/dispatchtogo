import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { releaseHeldRequestsForOrg } from "@/lib/billing";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const platformBillId = invoice.metadata?.platformBillId;

    if (platformBillId) {
      await prisma.platformBill.updateMany({
        where: { id: platformBillId, status: { not: "VOID" } },
        data: { status: "PAID", paidAt: new Date() },
      });
    }
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;

    // Only handle setup-mode sessions (payment method collection)
    if (checkoutSession.mode === "setup") {
      const organizationId = checkoutSession.metadata?.organizationId;
      if (!organizationId) {
        console.error("[webhook] checkout.session.completed: missing organizationId in metadata");
        return NextResponse.json({ received: true });
      }

      // Attach the saved payment method as the customer's default
      try {
        const setupIntentId =
          typeof checkoutSession.setup_intent === "string"
            ? checkoutSession.setup_intent
            : checkoutSession.setup_intent?.id;

        if (setupIntentId) {
          const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
          const paymentMethodId =
            typeof setupIntent.payment_method === "string"
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id;

          if (paymentMethodId && checkoutSession.customer) {
            const customerId =
              typeof checkoutSession.customer === "string"
                ? checkoutSession.customer
                : checkoutSession.customer.id;

            await stripe.paymentMethods.attach(paymentMethodId, {
              customer: customerId,
            });

            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
          }
        }
      } catch (err) {
        console.error("[webhook] Failed to attach payment method:", err);
      }

      // Mark the org as having a payment method and release held requests
      await prisma.organization.update({
        where: { id: organizationId },
        data: { hasPaymentMethod: true },
      });

      await releaseHeldRequestsForOrg(organizationId);
    }
  }

  return NextResponse.json({ received: true });
}
