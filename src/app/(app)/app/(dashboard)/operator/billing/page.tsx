import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrganizationUsageForPeriod, currentPeriodStart, currentPeriodEnd } from "@/lib/billing";
import { BILLING_PLANS, PLATFORM_BILL_STATUSES } from "@/lib/constants";
import { TrendingUp, CheckCircle2, ExternalLink, Receipt } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";

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
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as { role: string; organizationId?: string };
  if (user.role !== "OPERATOR") redirect("/");
  if (!user.organizationId) redirect("/app/operator");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [org, billsTotal, bills, usage] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: { name: true, plan: true },
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
  ]);

  const totalPages = Math.ceil(billsTotal / PAGE_SIZE);

  const planConfig = BILLING_PLANS[org.plan] ?? BILLING_PLANS["FREE"];
  const usagePercent = Math.min(100, Math.round((usage.completedRequests / planConfig.includedRequests) * 100));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your plan, current usage, and billing history
        </p>
      </div>

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
                {planConfig.includedRequests} completed requests / month
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
              ${planConfig.ratePerRequest.toFixed(2)} CAD per additional completed request
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              This Month's Usage
              <span className="text-xs font-normal text-gray-500">
                ({formatMonth(currentPeriodStart())})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">
                  {usage.completedRequests} of {planConfig.includedRequests} included
                </span>
                <span className={`font-medium ${usage.isOverLimit ? "text-amber-600" : "text-emerald-600"}`}>
                  {usagePercent}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    usage.isOverLimit ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {usage.isOverLimit ? (
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
                {planConfig.includedRequests - usage.completedRequests} requests remaining this month
                at no extra charge.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

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
                          {bill.status}
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
