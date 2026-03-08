import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
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

// ─── Build/ensure a Stripe invoice for a bill (shared by preview & send) ─────

async function ensureStripeInvoice(
  bill: Awaited<ReturnType<typeof prisma.platformBill.findUniqueOrThrow>> & {
    organization: Awaited<ReturnType<typeof prisma.organization.findUniqueOrThrow>>;
  }
): Promise<{ invoiceId: string; invoiceUrl: string | null }> {
  // Reuse existing Stripe invoice if it was already created during preview
  if (bill.stripeInvoiceId) {
    const existing = await stripe.invoices.retrieve(bill.stripeInvoiceId);
    return {
      invoiceId: existing.id,
      invoiceUrl: existing.hosted_invoice_url ?? null,
    };
  }

  const customerId = await ensureStripeCustomer(bill.organization);

  const periodLabel = bill.periodStart.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 30,
    currency: "cad",
    description: `DispatchToGo — Platform fee for ${periodLabel}`,
    metadata: { platformBillId: bill.id, organizationId: bill.organizationId },
  });

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: Math.round(bill.amountCad * 100),
    currency: "cad",
    description: `${bill.billableRequests} completed service request${
      bill.billableRequests !== 1 ? "s" : ""
    } × $${bill.ratePerRequest.toFixed(2)} CAD (${bill.includedRequests} included on ${
      BILLING_PLANS[bill.organization.plan]?.label ?? bill.organization.plan
    } plan)`,
  });

  const finalised = await stripe.invoices.finalizeInvoice(invoice.id);
  return {
    invoiceId: finalised.id,
    invoiceUrl: finalised.hosted_invoice_url ?? null,
  };
}

// ─── Preview bill via Stripe (finalize but don't send) ────────────────────────

/**
 * Create and finalise a Stripe invoice for a DRAFT PlatformBill without sending
 * it. Persists the stripeInvoiceId and stripeInvoiceUrl so the admin can review
 * the invoice before committing to send.
 */
export async function previewPlatformBill(platformBillId: string): Promise<string | null> {
  const bill = await prisma.platformBill.findUniqueOrThrow({
    where: { id: platformBillId },
    include: { organization: true },
  });

  if (bill.status !== "DRAFT") {
    throw new Error(`Bill ${platformBillId} is not in DRAFT status (current: ${bill.status})`);
  }

  const { invoiceId, invoiceUrl } = await ensureStripeInvoice(bill);

  // Persist the Stripe refs if not already stored
  if (!bill.stripeInvoiceId) {
    await prisma.platformBill.update({
      where: { id: platformBillId },
      data: { stripeInvoiceId: invoiceId, stripeInvoiceUrl: invoiceUrl },
    });
  }

  return invoiceUrl;
}

// ─── Send bill via Stripe ─────────────────────────────────────────────────────

/**
 * Finalise (if needed) and send a DRAFT PlatformBill via Stripe.
 * Reuses an existing Stripe invoice if one was already created during preview.
 */
export async function sendPlatformBill(platformBillId: string): Promise<void> {
  const bill = await prisma.platformBill.findUniqueOrThrow({
    where: { id: platformBillId },
    include: { organization: true },
  });

  if (bill.status !== "DRAFT") {
    throw new Error(`Bill ${platformBillId} is not in DRAFT status (current: ${bill.status})`);
  }

  const { invoiceId, invoiceUrl } = await ensureStripeInvoice(bill);

  // $0 invoices are auto-paid by Stripe on finalization — can't call sendInvoice.
  // Fall back to sending the hosted invoice URL via the app's email system.
  const stripeInvoice = await stripe.invoices.retrieve(invoiceId);
  if (stripeInvoice.status !== "paid") {
    await stripe.invoices.sendInvoice(invoiceId);
  } else {
    const recipientEmail =
      bill.organization.billingEmail ??
      bill.organization.contactEmail ??
      (bill.organization as { email?: string | null }).email ??
      null;

    if (recipientEmail) {
      const periodLabel = bill.periodStart.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        timeZone: "UTC",
      });
      const invoiceLink = invoiceUrl
        ? `<p><a href="${invoiceUrl}" style="color:#2563eb">View your invoice on Stripe</a></p>`
        : "";

      await sendEmail(
        recipientEmail,
        `DispatchToGo — Platform invoice for ${periodLabel} ($0.00 CAD)`,
        `<p>Hi ${bill.organization.name},</p>
<p>Your DispatchToGo platform invoice for <strong>${periodLabel}</strong> has been issued.</p>
<p><strong>Amount due: $0.00 CAD</strong><br/>
You had no billable requests this period — this invoice has been automatically marked as paid.</p>
${invoiceLink}
<p>Thank you,<br/>The DispatchToGo Team</p>`
      );
    }
  }

  await prisma.platformBill.update({
    where: { id: platformBillId },
    data: {
      status: "SENT",
      stripeInvoiceId: invoiceId,
      stripeInvoiceUrl: invoiceUrl,
      sentAt: new Date(),
    },
  });
}

// ─── Generate draft for a single org (even at $0) ────────────────────────────

/**
 * Create or refresh a DRAFT PlatformBill for a specific org in a period,
 * regardless of whether the amount due is $0.
 * Throws if a non-DRAFT bill already exists for the period.
 */
export async function generateDraftBillForOrg(
  orgId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ created: boolean; updated: boolean }> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { plan: true },
  });

  const usage = await getOrganizationUsageForPeriod(orgId, periodStart, periodEnd);
  const plan = BILLING_PLANS[org.plan] ?? BILLING_PLANS["FREE"];

  const data = {
    includedRequests: plan.includedRequests,
    completedRequests: usage.completedRequests,
    billableRequests: usage.billableRequests,
    ratePerRequest: plan.ratePerRequest,
    amountCad: usage.amountCad,
  };

  const existing = await prisma.platformBill.findUnique({
    where: { organizationId_periodStart: { organizationId: orgId, periodStart } },
  });

  if (existing) {
    if (existing.status !== "DRAFT") {
      throw new Error(
        `A bill already exists for this period with status: ${existing.status}. Void it first.`
      );
    }
    await prisma.platformBill.update({ where: { id: existing.id }, data });
    return { created: false, updated: true };
  }

  await prisma.platformBill.create({
    data: { ...data, organizationId: orgId, periodStart, periodEnd, status: "DRAFT" },
  });
  return { created: true, updated: false };
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

// ─── Payment Gate ─────────────────────────────────────────────────────────────

/**
 * Returns true when an org has consumed all of their free included dispatches
 * AND has not yet added a payment method.
 *
 * "Dispatches" for gating purposes = all ServiceRequests submitted this month
 * (not just completed jobs, so operators feel the limit before overage accrues).
 */
export async function isOrgPaymentGated(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, hasPaymentMethod: true },
  });
  if (!org) return false;
  if (org.hasPaymentMethod) return false;

  const plan = BILLING_PLANS[org.plan] ?? BILLING_PLANS["FREE"];
  const periodStart = currentPeriodStart();
  const periodEnd = currentPeriodEnd();

  const submittedCount = await prisma.serviceRequest.count({
    where: {
      organizationId: orgId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  });

  return submittedCount >= plan.includedRequests;
}

/**
 * Dispatch all service requests for an org that are sitting at READY_TO_DISPATCH
 * (held because the org was payment-gated). Called after payment method is saved.
 */
export async function releaseHeldRequestsForOrg(orgId: string): Promise<void> {
  const { autoDispatch } = await import("@/lib/auto-dispatch");

  const held = await prisma.serviceRequest.findMany({
    where: {
      organizationId: orgId,
      status: "READY_TO_DISPATCH",
    },
    select: { id: true },
  });

  for (const req of held) {
    try {
      await autoDispatch(req.id, null);
    } catch (err) {
      console.error(`[releaseHeldRequests] Failed to dispatch request ${req.id}:`, err);
    }
  }
}
