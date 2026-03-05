import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "Dashboard | DispatchToGo",
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

export default async function OperatorDashboardPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { organization: true },
  });

  if (!dbUser?.organization) redirect("/app/onboarding");
  const org = dbUser.organization;

  const [requests, properties] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        property: { select: { name: true } },
        jobs: { select: { status: true } },
      },
    }),
    prisma.property.count({ where: { organizationId: org.id } }),
  ]);

  // KPI counts
  const totalRequests = requests.length;
  const openRequests = requests.filter(
    (r) => !["COMPLETED", "CANCELLED"].includes(r.status)
  ).length;
  const completedRequests = requests.filter((r) => r.status === "COMPLETED").length;
  const urgentRequests = requests.filter(
    (r) => r.priority === "URGENT" && !["COMPLETED", "CANCELLED"].includes(r.status)
  ).length;

  const recentRequests = requests.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <Building2 className="inline w-4 h-4 mr-1 text-gray-400" />
            {org.name}
          </p>
        </div>
        <Link
          href="/app/operator/requests/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Request
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-1.5">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalRequests}</p>
            <p className="text-xs text-gray-500 text-center">Total Requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-1.5">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{openRequests}</p>
            <p className="text-xs text-gray-500 text-center">Open</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-1.5">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{completedRequests}</p>
            <p className="text-xs text-gray-500 text-center">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-5 gap-1.5">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{urgentRequests}</p>
            <p className="text-xs text-gray-500 text-center">Urgent</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Building2 className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Properties</p>
                <p className="text-xs text-gray-400">Managed locations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-gray-900">{properties}</p>
              <Link
                href="/app/operator/properties"
                className="text-blue-500 hover:text-blue-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <ClipboardList className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">All Requests</p>
                <p className="text-xs text-gray-400">View & manage</p>
              </div>
            </div>
            <Link
              href="/app/operator/requests"
              className="text-blue-500 hover:text-blue-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Requests</h2>
          <Link
            href="/app/operator/requests"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-400">
              No requests yet.{" "}
              <Link
                href="/app/operator/requests/new"
                className="text-blue-600 hover:underline"
              >
                Create your first request
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentRequests.map((req) => (
              <Link key={req.id} href={`/app/operator/requests/${req.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3 px-4 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {req.title}
                        </p>
                        {req.priority === "URGENT" && (
                          <span className="flex-shrink-0 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {req.property.name} · {formatDate(req.createdAt)}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(req.status)}>
                      {getStatusLabel(req.status)}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
