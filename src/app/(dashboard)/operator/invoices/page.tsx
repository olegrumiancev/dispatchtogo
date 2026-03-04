import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUSES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { DollarSign, FileText } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";

export const metadata = {
  title: "Invoices | DispatchToGo",
};

const PAGE_SIZE = 25;

function getInvoiceStatusColor(status: string) {
  return INVOICE_STATUSES.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-800";
}

function getInvoiceStatusLabel(status: string) {
  return INVOICE_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  const orgId: string = user.organizationId!;

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = { organizationId: orgId };

  const [total, outstandingAgg, paidAgg, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    // Outstanding = SENT + OVERDUE
    prisma.invoice.aggregate({
      where: { ...where, status: { in: ["SENT", "OVERDUE"] } },
      _sum: { amount: true },
    }),
    // Paid
    prisma.invoice.aggregate({
      where: { ...where, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        serviceRequest: { select: { referenceNumber: true, id: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const outstanding = outstandingAgg._sum.amount ?? 0;
  const totalPaid = paidAgg._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} invoice{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(outstanding)}</p>
              <p className="text-xs text-gray-500">Outstanding</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-gray-500">Total Paid</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-500">Total Invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {total === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No invoices yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Invoices are generated when a job is completed.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Service Request
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Created
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Paid Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <Link
                        href={`/operator/requests/${invoice.serviceRequest.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {invoice.serviceRequest.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getInvoiceStatusColor(invoice.status)}>
                        {getInvoiceStatusLabel(invoice.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {invoice.paidAt ? formatDate(invoice.paidAt) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/operator/invoices"
        total={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
