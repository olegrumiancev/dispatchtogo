import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { releaseHeldRequestsForOrg } from "@/lib/billing";
import { sendPaymentFailedEmail } from "@/lib/email";
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

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const platformBillId = invoice.metadata?.platformBillId;

    if (platformBillId) {
      const bill = await prisma.platformBill.findUnique({
        where: { id: platformBillId },
        include: { organization: { select: { name: true, billingEmail: true, email: true, contactEmail: true } } },
      });

      if (bill && bill.status !== "VOID") {
        await prisma.platformBill.update({
          where: { id: platformBillId },
          data: { status: "PAST_DUE" },
        });

        const toEmail =
          bill.organization.billingEmail ??
          bill.organization.email ??
          bill.organization.contactEmail;

        if (toEmail) {
          await sendPaymentFailedEmail(
            toEmail,
            bill.organization.name,
            bill.amountCad,
            invoice.hosted_invoice_url
          ).catch((err) => console.error("[webhook] Failed to send payment failed email:", err));
        }
      }
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

      // Attach the saved payment method as the customer's default and store card details
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

            // Detach old payment method if it differs
            const existingOrg = await prisma.organization.findUnique({
              where: { id: organizationId },
              select: { stripePaymentMethodId: true },
            });
            if (existingOrg?.stripePaymentMethodId && existingOrg.stripePaymentMethodId !== paymentMethodId) {
              await stripe.paymentMethods.detach(existingOrg.stripePaymentMethodId).catch((err) =>
                console.error("[webhook] Failed to detach old payment method:", err)
              );
            }

            // NOTE: Stripe Checkout (setup mode) already attaches the PM to the customer.
            // We only need to set it as the default for invoices.
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });

            // Retrieve card details
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
            const card = pm.card;

            await prisma.organization.update({
              where: { id: organizationId },
              data: {
                hasPaymentMethod: true,
                stripePaymentMethodId: paymentMethodId,
                stripeCardBrand: card?.brand ?? null,
                stripeCardLast4: card?.last4 ?? null,
                stripeCardExpMonth: card?.exp_month ?? null,
                stripeCardExpYear: card?.exp_year ?? null,
              },
            });

            await releaseHeldRequestsForOrg(organizationId);
            return NextResponse.json({ received: true });
          }
        }
      } catch (err) {
        console.error("[webhook] Failed to attach payment method:", err);
      }

      // Fallback: mark as having a payment method even if card detail retrieval failed
      await prisma.organization.update({
        where: { id: organizationId },
        data: { hasPaymentMethod: true },
      });

      await releaseHeldRequestsForOrg(organizationId);
    }
  }

  return NextResponse.json({ received: true });
}
