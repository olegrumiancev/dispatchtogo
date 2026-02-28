import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { URGENCY_LEVELS, REQUEST_STATUSES } from "@/lib/constants";
import { Clock, MapPin, User, AlertTriangle } from "lucide-react";
import AssignModal from "./assign-modal";
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

export default async function DispatchBoardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const [unassignedRequests, activeJobs, availableVendors] = await Promise.all([
    // Requests ready to be dispatched (triaged or freshly submitted, with no jobs yet)
    prisma.serviceRequest.findMany({
      where: {
        status: { in: ["TRIAGED", "SUBMITTED"] },
        jobs: { none: {} },
      },
      include: {
        property: { select: { name: true, address: true } },
        organization: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [
        { urgency: "desc" },
        { createdAt: "asc" },
      ],
    }),

    // Active jobs: not yet completed
    prisma.job.findMany({
      where: {
        completedAt: null,
      },
      include: {
        request: {
          include: {
            property: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
        vendor: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // All vendor organizations with their skills for the assign modal
    prisma.organization.findMany({
      where: { type: "VENDOR" },
      include: {
        vendorSkills: {
          include: { category: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialize for client components
  const vendorsForModal = availableVendors.map((v) => ({
    id: v.id,
    name: v.name,
    phone: v.phone ?? "",
    skills: v.vendorSkills.map((s) => ({ category: s.category.name })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Unassigned / Ready to dispatch */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Ready to Dispatch
            </h2>
            <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {unassignedRequests.length}
            </span>
          </div>

          {unassignedRequests.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-400">
                No requests ready to dispatch.
              </CardContent>
            </Card>
          ) : (
            unassignedRequests.map((req) => (
              <Card key={req.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {req.id.slice(-8).toUpperCase()}
                        </span>
                        <Badge variant={getUrgencyColor(req.urgency)}>
                          {req.urgency === "EMERGENCY" && (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {req.urgency}
                        </Badge>
                        <Badge variant={getStatusColor(req.status)}>
                          {getStatusLabel(req.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {req.property.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {req.category.name} \u00b7 {req.organization.name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(req.createdAt)}
                      </div>
                    </div>
                    <AssignModal
                      requestRef={req.id.slice(-8).toUpperCase()}
                      requestId={req.id}
                      vendors={vendorsForModal}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: Active jobs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Active Jobs
            </h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {activeJobs.length}
            </span>
          </div>

          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-400">
                No active jobs.
              </CardContent>
            </Card>
          ) : (
            activeJobs.map((job) => {
              const sr = job.request;
              return (
                <Card key={job.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {sr.id.slice(-8).toUpperCase()}
                          </span>
                          <Badge variant={getStatusColor(sr.status)}>
                            {getStatusLabel(sr.status)}
                          </Badge>
                          <Badge variant={getUrgencyColor(sr.urgency)}>
                            {sr.urgency}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {sr.property.name}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{job.vendor.name}</span>
                          {job.vendor.phone && (
                            <>
                              <span className="text-gray-400 mx-1">\u00b7</span>
                              <a
                                href={`tel:${job.vendor.phone}`}
                                className="text-blue-600 hover:text-blue-700 text-xs"
                              >
                                {job.vendor.phone}
                              </a>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {sr.category.name}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
