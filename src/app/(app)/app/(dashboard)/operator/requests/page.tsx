import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUSES, SERVICE_CATEGORIES, PRIORITY_LEVELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  ClipboardList,
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { RequestsClientWrapper } from "./requests-client-wrapper";

export const metadata = {
  title: "Requests | DispatchToGo",
};

export default async function OperatorRequestsPage() {
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

  const requests = await prisma.serviceRequest.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { name: true, id: true } },
      jobs: { select: { status: true } },
    },
  });

  const properties = await prisma.property.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Compute summary stats
  const totalCount = requests.length;
  const openCount = requests.filter(
    (r) => !["COMPLETED", "CANCELLED"].includes(r.status)
  ).length;
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;
  const urgentCount = requests.filter(
    (r) => r.priority === "URGENT" && !["COMPLETED", "CANCELLED"].includes(r.status)
  ).length;

  const serialized = requests.map((r) => ({
    id: r.id,
    referenceNumber: r.referenceNumber,
    title: r.title,
    status: r.status,
    priority: r.priority,
    category: r.category,
    createdAt: r.createdAt.toISOString(),
    scheduledDate: r.scheduledDate?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    property: r.property,
    jobCount: r.jobs.length,
    hasActiveJob: r.jobs.some((j) =>
      ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(j.status)
    ),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            All requests for {org.name}
          </p>
        </div>
        <Link
          href="/app/operator/requests/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Request
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center py-4 gap-1">
            <div className="p-1.5 bg-blue-50 rounded">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{totalCount}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4 gap-1">
            <div className="p-1.5 bg-yellow-50 rounded">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{openCount}</p>
            <p className="text-xs text-gray-500">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4 gap-1">
            <div className="p-1.5 bg-emerald-50 rounded">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4 gap-1">
            <div className="p-1.5 bg-red-50 rounded">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{urgentCount}</p>
            <p className="text-xs text-gray-500">Urgent</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests list with client-side filtering */}
      <RequestsClientWrapper
        requests={serialized}
        properties={properties}
        statuses={REQUEST_STATUSES}
        categories={SERVICE_CATEGORIES}
        priorities={PRIORITY_LEVELS}
      />
    </div>
  );
}
