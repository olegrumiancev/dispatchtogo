import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { URGENCY_LEVELS, REQUEST_STATUSES, SERVICE_CATEGORIES } from "@/lib/constants";
import { Plus, ClipboardList, MapPin, Clock } from "lucide-react";
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

export default async function RequestsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const requests = await prisma.serviceRequest.findMany({
    where: { organizationId: user.organizationId },
    include: {
      property: { select: { name: true, address: true } },
      job: {
        select: {
          status: true,
          vendor: { select: { companyName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by status for the tab counts
  const counts = {
    all: requests.length,
    open: requests.filter((r) =>
      ["SUBMITTED", "READY_TO_DISPATCH", "DISPATCHED", "IN_PROGRESS"].includes(r.status)
    ).length,
    completed: requests.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
        <Link href="/operator/requests/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          All: {counts.all}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          Open: {counts.open}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
          Completed: {counts.completed}
        </span>
      </div>

      {/* Request list */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No service requests yet.</p>
            <Link href="/operator/requests/new">
              <Button className="mt-4" size="sm">
                Create your first request
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Link key={req.id} href={`/operator/requests/${req.id}`}>
              <Card className="hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {req.referenceNumber}
                        </span>
                        <Badge variant={getUrgencyColor(req.urgency)}>
                          {req.urgency}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {req.description}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {req.property.name}
                          {req.property.address && ` · ${req.property.address}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(req.createdAt)}
                        </span>
                      </div>
                      {req.job?.vendor && (
                        <p className="text-xs text-gray-500">
                          Vendor: {req.job.vendor.companyName}
                        </p>
                      )}
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant={getStatusColor(req.status)}>
                        {getStatusLabel(req.status)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {getCategoryLabel(req.category)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
