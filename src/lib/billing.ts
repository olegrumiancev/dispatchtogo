import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { BILLING_PLANS, BILLED_JOB_STATUSES } from "@/lib/constants";
import type { Organization } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgUsage {
  plan: string;
  includedRequests: number;
  completedRequests: number;
  billableRequests: number;
  ratePerRequest: number;
  amountCad: number;
  isOverLimit: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the first moment of the current calendar month (UTC). */
export function currentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Returns the last moment of the current calendar month (UTC). */
export function currentPeriodEnd(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

/** Returns start/end for a given YYYY-MM string. */
export function parsePeriod(month: string): { periodStart: Date; periodEnd: Date } {
  const [year, mon] = month.split("-").map(Number);
  const periodStart = new Date(Date.UTC(year, mon - 1, 1));
  const periodEnd = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));
  return { periodStart, periodEnd };
}

// ─── Usage calculation ────────────────────────────────────────────────────────

/**
 * Count completed+verified jobs for an org in a billing period, and compute
 * the billable amount.
 */
export async function getOrganizationUsageForPeriod(
  orgId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<OrgUsage> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { plan: true },
  });

  const plan = BILLING_PLANS[org.plan] ?? BILLING_PLANS["FREE"];

  const completedRequests = await prisma.job.count({
    where: {
      organizationId: orgId,
      status: { in: [...BILLED_JOB_STATUSES] },
      completedAt: { gte: periodStart, lte: periodEnd },
    },
  });

  const billableRequests = Math.max(0, completedRequests - plan.includedRequests);
  const amountCad = parseFloat((billableRequests * plan.ratePerRequest).toFixed(2));

  return {
    plan: org.plan,
    includedRequests: plan.includedRequests,
    completedRequests,
    billableRequests,
    ratePerRequest: plan.ratePerRequest,
    amountCad,
    isOverLimit: completedRequests > plan.includedRequests,
  };
}

// ─── Stripe customer ─────────────────────────────────────────────────────────

/**
 * Ensure the org has a Stripe customer ID — create one if not.
 */
export async function ensureStripeCustomer(org: Organization): Promise<string> {
  if (org.stripeCustomerId) return org.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: org.name,
    email: org.billingEmail ?? org.contactEmail ?? org.email ?? undefined,
    metadata: { organizationId: org.id },
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

// ─── Bill generation ─────────────────────────────────────────────────────────

/**
 * Generate or refresh DRAFT PlatformBill records for all orgs in a period.
 * Only creates/updates bills where amount > 0 OR a bill already exists.
 */
export async function generatePlatformBills(
  periodStart: Date,
  periodEnd: Date
): Promise<{ created: number; updated: number }> {
  const orgs = await prisma.organization.findMany({ select: { id: true, plan: true } });

  let created = 0;
  let updated = 0;

  for (const org of orgs) {
    const usage = await getOrganizationUsageForPeriod(org.id, periodStart, periodEnd);
    const plan = BILLING_PLANS[org.plan] ?? BILLING_PLANS["FREE"];

    // Only create a bill if there are billable requests (or one already exists)
    const existing = await prisma.platformBill.findUnique({
      where: { organizationId_periodStart: { organizationId: org.id, periodStart } },
    });

    if (!existing && usage.billableRequests === 0) continue;

    const data = {
      includedRequests: plan.includedRequests,
      completedRequests: usage.completedRequests,
      billableRequests: usage.billableRequests,
      ratePerRequest: plan.ratePerRequest,
      amountCad: usage.amountCad,
    };

    if (existing) {
      if (existing.status === "DRAFT") {
        await prisma.platformBill.update({ where: { id: existing.id }, data });
        updated++;
      }
    } else {
      await prisma.platformBill.create({
        data: {
          ...data,
          organizationId: org.id,
          periodStart,
          periodEnd,
          status: "DRAFT",
        },
      });
      created++;
    }
  }

  return { created, updated };
}

// ─── Send bill via Stripe ─────────────────────────────────────────────────────

/**
 * Finalise a DRAFT PlatformBill by creating a Stripe invoice and marking it SENT.
 */
export async function sendPlatformBill(platformBillId: string): Promise<void> {
  const bill = await prisma.platformBill.findUniqueOrThrow({
    where: { id: platformBillId },
    include: { organization: true },
  });

  if (bill.status !== "DRAFT") {
    throw new Error(`Bill ${platformBillId} is not in DRAFT status (current: ${bill.status})`);
  }

  const customerId = await ensureStripeCustomer(bill.organization);

  // Format period for description
  const periodLabel = bill.periodStart.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  // Create a Stripe invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 30,
    currency: "cad",
    description: `DispatchToGo — Platform fee for ${periodLabel}`,
    metadata: { platformBillId: bill.id, organizationId: bill.organizationId },
  });

  // Add a line item for the overage
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: Math.round(bill.amountCad * 100), // Stripe uses cents
    currency: "cad",
    description: `${bill.billableRequests} completed service request${bill.billableRequests !== 1 ? "s" : ""} × $${bill.ratePerRequest.toFixed(2)} CAD (${bill.includedRequests} included on ${BILLING_PLANS[bill.organization.plan]?.label ?? bill.organization.plan} plan)`,
  });

  // Finalise and send
  const finalised = await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.sendInvoice(finalised.id);

  await prisma.platformBill.update({
    where: { id: platformBillId },
    data: {
      status: "SENT",
      stripeInvoiceId: finalised.id,
      stripeInvoiceUrl: finalised.hosted_invoice_url ?? null,
      sentAt: new Date(),
    },
  });
}

// ─── Void bill ────────────────────────────────────────────────────────────────

export async function voidPlatformBill(platformBillId: string): Promise<void> {
  const bill = await prisma.platformBill.findUniqueOrThrow({
    where: { id: platformBillId },
  });

  if (bill.status === "VOID") return;

  // Void the Stripe invoice if it exists
  if (bill.stripeInvoiceId) {
    try {
      await stripe.invoices.voidInvoice(bill.stripeInvoiceId);
    } catch {
      // If already voided or paid, ignore
    }
  }

  await prisma.platformBill.update({
    where: { id: platformBillId },
    data: { status: "VOID" },
  });
}
