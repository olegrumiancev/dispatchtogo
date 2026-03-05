import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Wrench, ClipboardList, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { REQUEST_STATUSES } from "@/lib/constants";

function getStatusColor(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-800";
}

function getStatusLabel(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const [orgCount, userCount, vendorCount, requestStats, recentRequests] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.vendor.count({ where: { isActive: true } }),
    prisma.serviceRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.serviceRequest.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { name: true } },
        property: { select: { name: true } },
      },
    }),
  ]);

  const totalRequests = requestStats.reduce((sum, s) => sum + s._count._all, 0);
  const openRequests = requestStats
    .filter((s) => !["COMPLETED", "CANCELLED"].includes(s.status))
    .reduce((sum, s) => sum + s._count._all, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">System overview and quick actions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Organizations</p>
                <p className="text-xl font-bold text-gray-900">{orgCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4.5 h-4.5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Users</p>
                <p className="text-xl font-bold text-gray-900">{userCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Active Vendors</p>
                <p className="text-xl font-bold text-gray-900">{vendorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4.5 h-4.5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Total Requests</p>
                <p className="text-xl font-bold text-gray-900">{totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Open Requests</p>
                <p className="text-xl font-bold text-gray-900">{openRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent Requests</h2>
          <Link
            href="/app/admin/dispatch"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Dispatch Board →
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-400">
              No service requests yet.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Ref #</th>
                  <th className="text-left px-4 py-3">Organization</th>
                  <th className="text-left px-4 py-3">Property</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {req.referenceNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{req.organization.name}</td>
                    <td className="px-4 py-3 text-gray-700">{req.property.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusColor(req.status)}>
                        {getStatusLabel(req.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(req.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
