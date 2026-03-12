import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { URGENCY_LEVELS } from "@/lib/constants";
import { getServiceCategories, getServiceCategoryLabel } from "@/lib/catalog";
import {
  getAdminOperatorRequestStatusColor,
  getAdminOperatorRequestStatusLabel,
} from "@/lib/admin-operator-request-status";
import { ClipboardList, Clock, CheckCircle, TrendingUp, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

function getUrgencyColor(urgency: string) {
  return URGENCY_LEVELS.find((u) => u.value === urgency)?.color ?? "bg-gray-100 text-gray-800";
}

export default async function OperatorDashboard() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  const orgId: string = user.organizationId!;
  const serviceCategories = await getServiceCategories();

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
        job: {
          include: {
            notes: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
          },
        },
        requestViews: { where: { userId: user.id }, select: { viewedAt: true } },
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

  // Compute new-activity flag for recent requests
  const recentRequestsWithActivity = recentRequests.map((req) => {
    const job = req.job;
    const viewedAt = req.requestViews[0]?.viewedAt;
    const latestActivity = (
      [job?.enRouteAt, job?.arrivedAt, job?.completedAt, job?.notes[0]?.createdAt] as (Date | null | undefined)[]
    ).reduce<Date | null>((max, d) => {
      if (!d) return max;
      return !max || d > max ? d : max;
    }, null);
    const hasNewActivity = !!latestActivity && (!viewedAt || latestActivity > viewedAt);
    return { ...req, hasNewActivity };
  });

  const stats = [
    {
      label: "Open Requests",
      mobileLabel: "Open",
      value: openRequests,
      icon: ClipboardList,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "In Progress",
      mobileLabel: "Active",
      value: inProgress,
      icon: Clock,
      color: "bg-cyan-100 text-cyan-600",
    },
    {
      label: "Completed This Month",
      mobileLabel: "Done",
      value: completedThisMonth,
      icon: CheckCircle,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Avg Resolution Time",
      mobileLabel: "Avg Time",
      value: avgResolutionHours,
      icon: TrendingUp,
      color: "bg-orange-100 text-orange-600",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
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
        <Link href="/app/operator/requests/new">
          <Button variant="primary" size="md">
            <Plus className="w-4 h-4" />
            New Service Request
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="h-full">
              <CardContent className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-5">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${stat.color} sm:h-11 sm:w-11 sm:rounded-lg`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1">
                    <p className="text-base font-bold leading-none text-gray-900 sm:text-2xl">
                      {stat.value}
                    </p>
                    <p className="min-w-0 text-[11px] font-medium leading-4 text-gray-500 sm:hidden">
                      {stat.mobileLabel}
                    </p>
                  </div>
                  <p className="mt-1 hidden text-xs text-gray-500 sm:block">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent requests */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <CardTitle>Recent Requests</CardTitle>
            <Link
              href="/app/operator/requests"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          {recentRequests.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 sm:px-6 sm:py-10">
              No service requests yet.{" "}
              <Link href="/app/operator/requests/new" className="text-blue-600 hover:underline">
                Create one
              </Link>
              .
            </div>
          ) : (
            <table className="w-full table-fixed sm:table-auto">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-[38%] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:w-auto sm:px-6 sm:py-3">
                    Ref #
                  </th>
                  <th className="w-[34%] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:w-auto sm:px-6 sm:py-3">
                    Property
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                    Category
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                    Urgency
                  </th>
                  <th className="w-[28%] px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:w-auto sm:px-6 sm:py-3 sm:text-left">
                    Status
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentRequestsWithActivity.map((req) => (
                  <tr key={req.id} className={`hover:bg-gray-50 transition-colors ${req.hasNewActivity ? "bg-amber-50 hover:bg-amber-100" : ""}`}>
                    <td className="px-3 py-3 align-top sm:px-6 sm:py-4">
                      <div className="flex items-center gap-1.5">
                        {req.hasNewActivity && (
                          <span
                            title="New vendor activity"
                            className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"
                          />
                        )}
                        <Link
                          href={`/app/operator/requests/${req.id}`}
                          className="text-sm font-medium leading-5 text-blue-600 hover:text-blue-700"
                        >
                          {req.referenceNumber}
                        </Link>
                      </div>
                    </td>
                    <td className="max-w-[110px] px-3 py-3 text-sm text-gray-700 align-top sm:max-w-[160px] sm:px-6 sm:py-4">
                      {req.property.name}
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-gray-500 md:table-cell">
                      {getServiceCategoryLabel(serviceCategories, req.category)}
                    </td>
                    <td className="hidden px-6 py-4 sm:table-cell">
                      <Badge variant={getUrgencyColor(req.urgency)}>
                        {req.urgency}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right align-top sm:px-6 sm:py-4 sm:text-left">
                      <Badge
                        variant={getAdminOperatorRequestStatusColor(req.status)}
                        className="whitespace-nowrap px-2 py-0 text-[11px] sm:px-2.5 sm:py-0.5 sm:text-xs"
                      >
                        {getAdminOperatorRequestStatusLabel(req.status)}
                      </Badge>
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-gray-500 lg:table-cell">
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
