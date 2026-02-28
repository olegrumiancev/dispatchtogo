import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { URGENCY_LEVELS, REQUEST_STATUSES, SERVICE_CATEGORIES } from "@/lib/constants";
import { MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { VendorJobActions } from "@/components/forms/vendor-job-actions";

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

export default async function VendorJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  const vendorId: string = user.vendorId!;

  const sp = await searchParams;
  const tab = sp.tab === "mine" ? "mine" : sp.tab === "completed" ? "completed" : "available";

  // Available jobs: ServiceRequests with status DISPATCHED that have a Job for this vendor
  // where the job has NOT been accepted yet
  const [availableJobs, activeJobs, completedJobs] = await Promise.all([
    prisma.job.findMany({
      where: {
        vendorId,
        acceptedAt: null,
        serviceRequest: {
          status: "DISPATCHED",
        },
      },
      include: {
        serviceRequest: {
          include: {
            property: { select: { name: true, address: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Active jobs: accepted but not yet completed
    prisma.job.findMany({
      where: {
        vendorId,
        acceptedAt: { not: null },
        completedAt: null,
      },
      include: {
        serviceRequest: {
          include: {
            property: { select: { name: true, address: true } },
          },
        },
      },
      orderBy: { acceptedAt: "desc" },
    }),

    // Completed jobs: last 10
    prisma.job.findMany({
      where: {
        vendorId,
        completedAt: { not: null },
      },
      include: {
        serviceRequest: {
          include: {
            property: { select: { name: true, address: true } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-3 sm:gap-6 overflow-x-auto">
          <Link
            href="/vendor/jobs?tab=available"
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "available"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Available Jobs
            <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {availableJobs.length}
            </span>
          </Link>
          <Link
            href="/vendor/jobs?tab=mine"
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "mine"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            My Jobs
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {activeJobs.length}
            </span>
          </Link>
          <Link
            href="/vendor/jobs?tab=completed"
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "completed"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Completed
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {completedJobs.length}
            </span>
          </Link>
        </nav>
      </div>

      {/* Available jobs */}
      {tab === "available" && (
        <div className="space-y-4">
          {availableJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-gray-400">
                <p className="text-sm">No available jobs right now. Check back soon.</p>
              </CardContent>
            </Card>
          ) : (
            availableJobs.map((job) => {
              const sr = job.serviceRequest;
              return (
                <Card key={job.id}>
                  <CardContent className="py-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {sr.referenceNumber}
                          </span>
                          <Badge variant={getUrgencyColor(sr.urgency)}>
                            {sr.urgency}
                          </Badge>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {getCategoryLabel(sr.category)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{sr.property.name}</span>
                          {sr.property.address && (
                            <>
                              <span className="text-gray-400 mx-1">·</span>
                              <span className="text-gray-500 text-xs">{sr.property.address}</span>
                            </>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2">
                          {sr.description}
                        </p>

                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          Posted {formatDate(sr.createdAt)}
                        </div>
                      </div>

                      <VendorJobActions jobId={job.id} mode="available" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* My (active) jobs */}
      {tab === "mine" && (
        <div className="space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-gray-400">
                <p className="text-sm">No active jobs. Accept one from Available Jobs.</p>
              </CardContent>
            </Card>
          ) : (
            activeJobs.map((job) => {
              const sr = job.serviceRequest;
              return (
                <Card key={job.id}>
                  <CardContent className="py-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {sr.referenceNumber}
                          </span>
                          <Badge variant={getStatusColor(sr.status)}>
                            {getStatusLabel(sr.status)}
                          </Badge>
                          <Badge variant={getUrgencyColor(sr.urgency)}>
                            {sr.urgency}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{sr.property.name}</span>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2">
                          {sr.description}
                        </p>

                        {job.acceptedAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            Accepted {formatDate(job.acceptedAt)}
                          </div>
                        )}
                      </div>

                      <Link href={`/vendor/jobs/${job.id}`} className="flex-shrink-0">
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md px-3 py-2.5 min-h-[44px] hover:bg-blue-50 transition-colors">
                          View Details
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Completed jobs */}
      {tab === "completed" && (
        <div className="space-y-4">
          {completedJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-gray-400">
                <p className="text-sm">No completed jobs yet.</p>
              </CardContent>
            </Card>
          ) : (
            completedJobs.map((job) => {
              const sr = job.serviceRequest;
              return (
                <Card key={job.id}>
                  <CardContent className="py-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {sr.referenceNumber}
                          </span>
                          <Badge variant={getStatusColor(sr.status)}>
                            {getStatusLabel(sr.status)}
                          </Badge>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {getCategoryLabel(sr.category)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{sr.property.name}</span>
                        </div>

                        {job.completedAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            Completed {formatDate(job.completedAt)}
                          </div>
                        )}
                      </div>

                      <Link href={`/vendor/jobs/${job.id}`} className="flex-shrink-0">
                        <button className="text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md px-3 py-2.5 min-h-[44px] hover:bg-gray-50 transition-colors">
                          View Details
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
