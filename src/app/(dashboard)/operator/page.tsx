import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { URGENCY_LEVELS, REQUEST_STATUSES } from "@/lib/constants";
import {
  Plus,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
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

export default async function OperatorDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  // Get org-wide stats
  const [requests, recentRequests] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { organizationId: user.organizationId },
      select: { status: true, urgency: true },
    }),
    prisma.serviceRequest.findMany({
      where: { organizationId: user.organizationId },
      include: {
        property: { select: { name: true } },
        job: { select: { status: true, vendor: { select: { companyName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Stats
  const total = requests.length;
  const open = requests.filter((r) =>
    ["SUBMITTED", "READY_TO_DISPATCH", "DISPATCHED", "IN_PROGRESS"].includes(r.status)
  ).length;
  const completed = requests.filter((r) => r.status === "COMPLETED").length;
  const emergency = requests.filter(
    (r) => r.urgency === "EMERGENCY" && r.status !== "COMPLETED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link href="/operator/requests/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
          label="Total Requests"
          value={total}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-yellow-600" />}
          label="Open"
          value={open}
          bg="bg-yellow-50"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          label="Completed"
          value={completed}
          bg="bg-emerald-50"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          label="Emergencies"
          value={emergency}
          bg="bg-red-50"
        />
      </div>

      {/* Recent requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Requests</CardTitle>
            <Link href="/operator/requests">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentRequests.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No requests yet.</p>
              <Link href="/operator/requests/new">
                <Button className="mt-3" size="sm">
                  Create your first request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/operator/requests/${req.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {req.referenceNumber}
                      </span>
                      <Badge variant={getUrgencyColor(req.urgency)}>
                        {req.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {req.property.name} · {formatDate(req.createdAt)}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(req.status)}>
                    {getStatusLabel(req.status)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className={`${bg} p-2.5 rounded-lg`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
