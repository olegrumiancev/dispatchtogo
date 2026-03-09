import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrganizationUsageForPeriod, currentPeriodStart, currentPeriodEnd, releaseHeldRequestsForOrg, getOrgCompletedJobsWithBillingTag } from "@/lib/billing";
import { BILLING_PLANS, PLATFORM_BILL_STATUSES, BILLING_JOB_TAG_STYLES } from "@/lib/constants";
import { TrendingUp, CheckCircle2, ExternalLink, Receipt, AlertCircle } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { BillingActions } from "@/components/forms/billing-actions";
import { stripe } from "@/lib/stripe";

export const metadata = {
  title: "Billing | DispatchToGo",
};

const PAGE_SIZE = 24;

function getBillStatusColor(status: string) {
  return (
    PLATFORM_BILL_STATUSES.find((s) => s.value === status)?.color ??
    "bg-gray-100 text-gray-800"
  );
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "long", timeZone: "UTC" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default async function OperatorBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; held?: string; setup?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as { role: string; organizationId?: string };
  if (user.role !== "OPERATOR") redirect("/");
  if (!user.organizationId) redirect("/app/operator");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const showHeldNotice = sp.held === "1";
  const setupResult = sp.setup; // "success" | "cancelled" | undefined

  // When Stripe redirects back with ?setup=success, proactively sync the payment method
  // from Stripe rather than waiting for the webhook (which can be delayed or misconfigured).
  if (setupResult === "success") {
    try {
      const orgForSync = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { stripeCustomerId: true, hasPaymentMethod: true, stripePaymentMethodId: true },
      });

      if (orgForSync?.stripeCustomerId) {
        // List the customer's saved cards
        const pmList = await stripe.paymentMethods.list({
          customer: orgForSync.stripeCustomerId,
          type: "card",
          limit: 1,
        });

        const pm = pmList.data[0];
        if (pm) {
          const card = pm.card;
          const wasAlreadySet = orgForSync.hasPaymentMethod;

          await prisma.organization.update({
            where: { id: user.organizationId },
            data: {
              hasPaymentMethod: true,
              stripePaymentMethodId: pm.id,
              stripeCardBrand: card?.brand ?? null,
              stripeCardLast4: card?.last4 ?? null,
              stripeCardExpMonth: card?.exp_month ?? null,
              stripeCardExpYear: card?.exp_year ?? null,
            },
          });

          // Set as default invoice payment method
          await stripe.customers.update(orgForSync.stripeCustomerId, {
            invoice_settings: { default_payment_method: pm.id },
          }).catch(() => {/* non-critical */});

          // Release held requests only if this is a newly added payment method
          if (!wasAlreadySet) {
            await releaseHeldRequestsForOrg(user.organizationId);
          }
        }
      }
    } catch (err) {
      console.error("[billing-page] Failed to sync payment method from Stripe:", err);
    }
  }

  const [org, billsTotal, bills, usage, heldCount, completedJobsWithTags] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: {
        name: true,
        plan: true,
        hasPaymentMethod: true,
        stripeCardBrand: true,
        stripeCardLast4: true,
        stripeCardExpMonth: true,
        stripeCardExpYear: true,
      },
    }),
    prisma.platformBill.count({ where: { organizationId: user.organizationId } }),
    prisma.platformBill.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { periodStart: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    getOrganizationUsageForPeriod(
      user.organizationId,
      currentPeriodStart(),
      currentPeriodEnd()
    ),
    prisma.serviceRequest.count({
      where: { organizationId: user.organizationId, status: "READY_TO_DISPATCH" },
    }),
    getOrgCompletedJobsWithBillingTag(user.organizationId, currentPeriodStart(), currentPeriodEnd(), 20),
  ]);

  const totalPages = Math.ceil(billsTotal / PAGE_SIZE);

  const planConfig = BILLING_PLANS[org.plan] ?? BILLING_PLANS["FREE"];

  // Always gate on submitted requests — this matches isOrgPaymentGated() and avoids the
  // counter jumping to 0 when a FREE-plan operator adds a payment method (at which point
  // completedRequests is 0 because the held jobs haven't run yet).
  const gateCount = usage.submittedRequests;
  const usagePercent = Math.min(100, Math.round((gateCount / planConfig.includedRequests) * 100));
  const isNearLimit = !org.hasPaymentMethod && usage.submittedRequests >= planConfig.includedRequests - 2;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your plan, current usage, and billing history
        </p>
      </div>

      {/* Held-request redirect notice */}
      {showHeldNotice && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">Your request was saved but is on hold</p>
            <p className="text-amber-700 mt-0.5">
              You&apos;ve reached your free plan limit. Add a payment method below to dispatch it
              and any other held requests.
            </p>
          </div>
        </div>
      )}

      {/* Stripe setup result notice */}
      {setupResult === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-800">Payment method added successfully</p>
            <p className="text-emerald-700 mt-0.5">
              Your held requests are being dispatched now.
            </p>
          </div>
        </div>
      )}
      {setupResult === "cancelled" && (
        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
          Payment setup was cancelled. Your held requests remain on hold until a payment method
          is added.
        </div>
      )}

      {/* Current plan + usage */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge className={org.plan === "VALUE" ? "bg-purple-100 text-purple-800 text-sm px-3 py-1" : "bg-gray-100 text-gray-800 text-sm px-3 py-1"}>
                {planConfig.label}
              </Badge>
              <span className="text-sm text-gray-500">
                {planConfig.includedRequests} free dispatches / month
              </span>
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              Unlimited properties
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              All platform features included
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ${planConfig.ratePerRequest.toFixed(2)} CAD per completed request above {planConfig.includedRequests}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              This Month&apos;s Usage
              <span className="text-xs font-normal text-gray-500">
                ({formatMonth(currentPeriodStart())})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">
                  {usage.submittedRequests} of {planConfig.includedRequests} dispatched
                </span>
                <span className={`font-medium ${
                  usage.isOverLimit || (!org.hasPaymentMethod && usage.submittedRequests >= planConfig.includedRequests)
                    ? "text-amber-600"
                    : isNearLimit
                    ? "text-yellow-600"
                    : "text-emerald-600"
                }`}>
                  {usagePercent}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    usage.isOverLimit || (!org.hasPaymentMethod && usage.submittedRequests >= planConfig.includedRequests)
                      ? "bg-amber-500"
                      : isNearLimit
                      ? "bg-yellow-400"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {/* No payment method — show gate-based status */}
            {!org.hasPaymentMethod && (
              usage.submittedRequests >= planConfig.includedRequests ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Free limit reached — new requests are held</p>
                    <p className="text-amber-700 mt-0.5">
                      You&apos;ve submitted {usage.submittedRequests} of {planConfig.includedRequests} free requests this month.
                      Add a payment method to dispatch held and future requests.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-sm text-gray-500">
                    {planConfig.includedRequests - usage.submittedRequests} free dispatch{planConfig.includedRequests - usage.submittedRequests !== 1 ? "es" : ""} remaining
                    this month before a payment method is required.
                  </p>
                  <p className="text-xs text-gray-400">
                    {usage.completedRequests} completed · {usage.submittedRequests - usage.completedRequests} in progress
                  </p>
                </div>
              )
            )}

            {/* Has payment method — show billing-based status */}
            {org.hasPaymentMethod && (
              usage.isOverLimit ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Pay-as-you-go active</p>
                    <p className="text-amber-700 mt-0.5">
                      {usage.billableRequests} extra request{usage.billableRequests !== 1 ? "s" : ""} ×
                      ${planConfig.ratePerRequest.toFixed(2)} = <strong>${usage.amountCad.toFixed(2)} CAD</strong> estimated this month
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {planConfig.includedRequests - usage.completedRequests} completed requests remaining
                  in your included {planConfig.includedRequests} this month.
                </p>
              )
            )}

            {/* Completed requests breakdown with billing tags */}
            {completedJobsWithTags.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Completed this month
                </p>
                <div className="divide-y divide-gray-100 rounded-md border border-gray-100 overflow-hidden">
                  {completedJobsWithTags.map((entry) => {
                    const tagStyle = BILLING_JOB_TAG_STYLES[entry.billingTag];
                    return (
                      <a
                        key={entry.jobId}
                        href={`/app/operator/requests/${entry.serviceRequestId}`}
                        className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-blue-600 shrink-0">{entry.referenceNumber}</span>
                          <span className="text-gray-500 truncate hidden sm:block">{entry.propertyName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-400">{formatDate(entry.completedAt)}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tagStyle.className}`}>
                            {tagStyle.label}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
                {usage.completedRequests > completedJobsWithTags.length && (
                  <p className="text-xs text-gray-400 text-right pt-1">
                    Showing {completedJobsWithTags.length} of {usage.completedRequests} completed
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment method & plan upgrade actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment &amp; Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <BillingActions
            hasPaymentMethod={org.hasPaymentMethod}
            currentPlan={org.plan}
            isOverLimit={usage.isOverLimit}
            heldRequestsCount={heldCount}
            cardBrand={org.stripeCardBrand}
            cardLast4={org.stripeCardLast4}
            cardExpMonth={org.stripeCardExpMonth}
            cardExpYear={org.stripeCardExpYear}
          />
        </CardContent>
      </Card>

      {/* Billing history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-500" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No invoices yet. Bills are generated at the end of each month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Included</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (CAD)</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{formatMonth(bill.periodStart)}</p>
                        {bill.paidAt && (
                          <p className="text-xs text-gray-400 mt-0.5">Paid {formatDate(bill.paidAt)}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-700 font-semibold">{bill.completedRequests}</td>
                      <td className="px-4 py-4 text-center text-sm text-gray-500">{bill.includedRequests}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-bold ${bill.amountCad > 0 ? "text-gray-900" : "text-gray-400"}`}>
                          ${bill.amountCad.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge className={getBillStatusColor(bill.status)}>
                          {PLATFORM_BILL_STATUSES.find((s) => s.value === bill.status)?.label ?? bill.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {bill.stripeInvoiceUrl ? (
                          <a
                            href={bill.stripeInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            View <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/app/operator/billing"
        total={billsTotal}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
