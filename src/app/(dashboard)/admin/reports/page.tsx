import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  REQUEST_STATUSES,
  SERVICE_CATEGORIES,
} from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  ClipboardList,
  CheckCircle,
  DollarSign,
  Users,
  Building2,
  TrendingUp,
} from "lucide-react";

export const metadata = {
  title: "Reports | DispatchToGo Admin",
};

function getStatusColor(status: string) {
  return (
    REQUEST_STATUSES.find((s) => s.value === status)?.color ??
    "bg-gray-100 text-gray-800"
  );
}

function getStatusLabel(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalRequests,
    requestsThisMonth,
    totalCompletedJobs,
    activeVendors,
    activeOrgs,
    invoiceTotal,
    requestsByStatus,
    requestsByCategory,
    recentRequests,
    completedJobsForAvg,
  ] = await Promise.all([
    // Total service requests (all time)
    prisma.serviceRequest.count(),

    // Requests this month
    prisma.serviceRequest.count({
      where: { createdAt: { gte: firstOfMonth } },
    }),

    // Total completed jobs
    prisma.job.count({ where: { completedAt: { not: null } } }),

    // Active vendors
    prisma.vendor.count({ where: { isActive: true } }),

    // Active organizations (have at least one user)
    prisma.organization.count(),

    // Total invoice amount (all statuses summed)
    prisma.invoice.aggregate({
      _sum: { amount: true },
    }),

    // Requests by status
    prisma.serviceRequest.groupBy({
      by: ["status"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // Requests by category
    prisma.serviceRequest.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // Recent 10 service requests
    prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        property: { select: { name: true } },
        organization: { select: { name: true } },
      },
    }),

    // Completed jobs with timestamps for avg resolution
    prisma.job.findMany({
      where: { completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
      take: 500,
      orderBy: { completedAt: "desc" },
    }),
  ]);

  // Calculate average resolution time in hours
  let avgResolutionHours = "—";
  if (completedJobsForAvg.length > 0) {
    const totalMs = completedJobsForAvg.reduce((sum, job) => {
      if (!job.completedAt) return sum;
      return sum + (job.completedAt.getTime() - job.createdAt.getTime());
    }, 0);
    const avgMs = totalMs / completedJobsForAvg.length;
    const hours = avgMs / (1000 * 60 * 60);
    avgResolutionHours = `${hours.toFixed(1)}h`;
  }

  const totalInvoiceAmount = invoiceTotal._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide KPIs and activity overview.</p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalRequests}</p>
            <p className="text-xs text-gray-500 text-center">Total Requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{requestsThisMonth}</p>
            <p className="text-xs text-gray-500 text-center">This Month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalCompletedJobs}</p>
            <p className="text-xs text-gray-500 text-center">Completed Jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(totalInvoiceAmount)}
            </p>
            <p className="text-xs text-gray-500 text-center">Total Invoiced</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeVendors}</p>
            <p className="text-xs text-gray-500 text-center">Active Vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-2">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Building2 className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeOrgs}</p>
            <p className="text-xs text-gray-500 text-center">Organizations</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requestsByStatus.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-gray-400">
                      No data
                    </td>
                  </tr>
                ) : (
                  requestsByStatus.map((row) => (
                    <tr key={row.status} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Badge variant={getStatusColor(row.status)}>
                          {getStatusLabel(row.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-900">
                        {row._count.id}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-500 hidden sm:table-cell">
                        {totalRequests > 0
                          ? `${((row._count.id / totalRequests) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Requests by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requestsByCategory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-gray-400">
                      No data
                    </td>
                  </tr>
                ) : (
                  requestsByCategory.map((row) => (
                    <tr key={row.category} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-700">
                        {getCategoryLabel(row.category)}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-900">
                        {row._count.id}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-500 hidden sm:table-cell">
                        {totalRequests > 0
                          ? `${((row._count.id / totalRequests) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Avg resolution time + recent activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Avg Resolution Time */}
        <Card>
          <CardHeader>
            <CardTitle>Average Resolution Time</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-5xl font-bold text-gray-900">{avgResolutionHours}</p>
            <p className="text-sm text-gray-500">from job creation to completion</p>
            <p className="text-xs text-gray-400 mt-1">
              Based on {completedJobsForAvg.length} completed job
              {completedJobsForAvg.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentRequests.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-gray-400">
                  No activity yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ref #
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Organization
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Property
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {req.referenceNumber}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                            {req.organization.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[140px] truncate">
                            {req.property.name}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getStatusColor(req.status)}>
                              {getStatusLabel(req.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                            {formatDate(req.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
