import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUSES, URGENCY_LEVELS, SERVICE_CATEGORIES } from "@/lib/constants";
import { ClipboardList, Clock, CheckCircle, TrendingUp, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

function getUrgencyColor(urgency: string) {
  return URGENCY_LEVELS.find((u) => u.value === urgency)?.color ?? "bg-gray-100 text-gray-800";
}

function getStatusColor(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-800";
}

function getStatusLabel(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export default async function OperatorDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  const orgId: string = user.organizationId!;

  // Fetch organization name
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  // First day of current month
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run all stat queries in parallel
  const [
    openRequests,
    inProgress,
    completedThisMonth,
    completedForAvg,
    recentRequests,
  ] = await Promise.all([
    // Open requests: NOT in terminal statuses
    prisma.serviceRequest.count({
      where: {
        organizationId: orgId,
        status: {
          notIn: ["COMPLETED", "VERIFIED", "CANCELLED"],
        },
      },
    }),

    // In-progress count
    prisma.serviceRequest.count({
      where: {
        organizationId: orgId,
        status: "IN_PROGRESS",
      },
    }),

    // Completed this month
    prisma.serviceRequest.count({
      where: {
        organizationId: orgId,
        status: { in: ["COMPLETED", "VERIFIED"] },
        resolvedAt: { gte: firstOfMonth },
      },
    }),

    // For avg resolution: fetch completed this month with timestamps
    prisma.serviceRequest.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["COMPLETED", "VERIFIED"] },
        resolvedAt: { gte: firstOfMonth },
        createdAt: { not: undefined },
      },
      select: { createdAt: true, resolvedAt: true },
    }),

    // Recent 10 requests
    prisma.serviceRequest.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        property: { select: { name: true } },
      },
    }),
  ]);

  // Calculate average resolution hours
  let avgResolutionHours: string = "—";
  if (completedForAvg.length > 0) {
    const totalMs = completedForAvg.reduce((sum, r) => {
      if (!r.resolvedAt) return sum;
      return sum + (r.resolvedAt.getTime() - r.createdAt.getTime());
    }, 0);
    const avgMs = totalMs / completedForAvg.length;
    const hours = avgMs / (1000 * 60 * 60);
    avgResolutionHours = `${hours.toFixed(1)}h`;
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back,{" "}
            <span className="font-medium text-gray-700">
              {user?.name ?? user?.email}
            </span>{" "}
            — {org?.name ?? "Your Organization"}
          </p>
        </div>
        <Link href="/operator/requests/new">
          <Button variant="primary" size="md">
            <Plus className="w-4 h-4" />
            New Service Request
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{openRequests}</p>
              <p className="text-xs text-gray-500">Open Requests</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Clock className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{inProgress}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedThisMonth}</p>
              <p className="text-xs text-gray-500">Completed This Month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgResolutionHours}</p>
              <p className="text-xs text-gray-500">Avg Resolution Time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Requests</CardTitle>
            <Link
              href="/operator/requests"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          {recentRequests.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              No service requests yet.{" "}
              <Link href="/operator/requests/new" className="text-blue-600 hover:underline">
                Create one
              </Link>
              .
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ref #
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Urgency
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/operator/requests/${req.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {req.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-[160px] truncate">
                      {req.property.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {getCategoryLabel(req.category)}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <Badge variant={getUrgencyColor(req.urgency)}>
                        {req.urgency}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(req.status)}>
                        {getStatusLabel(req.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {formatDate(req.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
