import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { URGENCY_LEVELS, REQUEST_STATUSES } from "@/lib/constants";
import { getServiceCategories, getServiceCategoryLabel } from "@/lib/catalog";
import {
  MapPin,
  Clock,
  Phone,
  RotateCcw,
  PauseCircle,
  ShieldCheck,
  ExternalLink,
  ImageIcon,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { VendorJobActions } from "@/components/forms/vendor-job-actions";
import { VendorNotificationBanner } from "@/components/forms/vendor-notification-banner";
import type { VendorNotif } from "@/components/forms/vendor-notification-banner";
import {
  VendorJobsViewSwipeShell,
} from "@/components/vendor/jobs-view-swipe-shell";
import {
  VendorJobsViewToggle,
  type VendorJobsView,
} from "@/components/vendor/jobs-view-toggle";
import {
  getCommercialIndicator,
  latestQuoteSummaryRelationArgs,
} from "@/lib/quotes";

function getUrgencyColor(urgency: string) {
  return URGENCY_LEVELS.find((u) => u.value === urgency)?.color ?? "bg-gray-100 text-gray-800";
}

function getStatusColor(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-800";
}

function getStatusLabel(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

const PAGE_SIZE = 25;

export default async function VendorJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  const vendorId: string = user.vendorId!;
  const serviceCategories = await getServiceCategories();

  const sp = await searchParams;
  const requestedTab =
    sp.tab === "mine" ? "mine" : sp.tab === "completed" ? "completed" : sp.tab === "available" ? "available" : null;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [availableJobs, activeJobs, completedTotal, completedJobs, unreadNotifications] = await Promise.all([
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
            property: {
              select: {
                name: true,
                address: true,
                contactName: true,
                contactPhone: true,
              },
            },
            quotes: latestQuoteSummaryRelationArgs,
            _count: { select: { photos: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({
      where: {
        vendorId,
        acceptedAt: { not: null },
        completedAt: null,
      },
      include: {
        serviceRequest: {
          include: {
            property: {
              select: {
                name: true,
                address: true,
                contactName: true,
                contactPhone: true,
              },
            },
            quotes: latestQuoteSummaryRelationArgs,
            organization: {
              select: {
                name: true,
                contactPhone: true,
              },
            },
          },
        },
      },
      orderBy: { acceptedAt: "desc" },
    }),
    prisma.job.count({
      where: { vendorId, completedAt: { not: null } },
    }),
    prisma.job.findMany({
      where: {
        vendorId,
        completedAt: { not: null },
      },
      include: {
        serviceRequest: {
          include: {
            property: {
              select: {
                name: true,
                address: true,
                contactName: true,
                contactPhone: true,
              },
            },
            quotes: latestQuoteSummaryRelationArgs,
          },
        },
      },
      orderBy: { completedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.notification.findMany({
      where: { userId: user.id, read: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const notifProps: VendorNotif[] = unreadNotifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    link: n.link,
    metadata: (n.metadata ?? null) as VendorNotif["metadata"],
    createdAt: n.createdAt.toISOString(),
  }));

  const tab: VendorJobsView = requestedTab
    ? requestedTab
    : availableJobs.length > 0
    ? "available"
    : activeJobs.length > 0
    ? "mine"
    : "available";
  const tabLinks: Record<VendorJobsView, string> = {
    available: "/app/vendor/jobs?tab=available",
    mine: "/app/vendor/jobs?tab=mine",
    completed: "/app/vendor/jobs?tab=completed",
  };
  const tabCounts: Record<VendorJobsView, number> = {
    available: availableJobs.length,
    mine: activeJobs.length,
    completed: completedTotal,
  };
  const getJobCommercialIndicator = (job: {
    quoteDisposition: string | null;
    serviceRequest: {
      quotePolicy: string;
      quotes: Parameters<typeof getCommercialIndicator>[0]["quotes"];
    };
  }) =>
    getCommercialIndicator({
      quotePolicy: job.serviceRequest.quotePolicy,
      quoteDisposition: job.quoteDisposition,
      quotes: job.serviceRequest.quotes,
    });

  return (
    <VendorJobsViewSwipeShell view={tab} links={tabLinks}>
      <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        {completedTotal > 0 && (
          <Link href="/app/vendor/proof-packets" className="inline-flex">
            <button className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              Proof Packets
            </button>
          </Link>
        )}
      </div>

      <div className="sticky top-16 z-20 -mx-4 space-y-3 bg-white/90 px-4 pb-3 pt-2 backdrop-blur-sm md:-mx-6 md:px-6">
        {notifProps.length > 0 && <VendorNotificationBanner notifications={notifProps} />}
        <div className="flex justify-center">
          <VendorJobsViewToggle view={tab} links={tabLinks} counts={tabCounts} />
        </div>
      </div>

      {tab === "available" && (
        <div id="available-jobs" className="space-y-4">
          {availableJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                <p className="text-sm">No available jobs right now. Check back soon.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden space-y-2 md:block">
                {availableJobs.map((job) => {
                  const sr = job.serviceRequest as any;
                  const commercialIndicator = getJobCommercialIndicator(job as any);
                  return (
                    <Card key={job.id}>
                      <CardContent className="px-4 py-4">
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.25fr)_140px_auto] items-start gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900">
                                  {sr.referenceNumber}
                                </span>
                                <Badge variant={getUrgencyColor(sr.urgency)}>{sr.urgency}</Badge>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                  {getServiceCategoryLabel(serviceCategories, sr.category)}
                                </span>
                                {commercialIndicator && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${commercialIndicator.className}`}
                                  >
                                    {commercialIndicator.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-start gap-2 text-sm text-gray-700">
                                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-gray-900">{sr.property.name}</p>
                                  <p className="truncate text-xs text-gray-500">
                                    {sr.property.address || "Address not provided"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs text-gray-500">
                              <div className="inline-flex items-center gap-1">
                                <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
                                {sr._count.photos} photo{sr._count.photos !== 1 ? "s" : ""}
                              </div>
                              <div className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {formatDate(sr.createdAt)}
                              </div>
                            </div>

                            <div className="flex items-start justify-end gap-2">
                              <Link href={`/app/vendor/jobs/${job.id}`} className="flex-shrink-0">
                                <button className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900">
                                  <ExternalLink className="h-4 w-4" />
                                  Preview
                                </button>
                              </Link>
                              <VendorJobActions jobId={job.id} mode="available" layout="inline" />
                            </div>
                          </div>

                          <div className="min-w-0 space-y-2 border-t border-gray-100 pt-2.5">
                            <p className="line-clamp-2 text-sm text-gray-700">{sr.description}</p>
                            {sr.aiTriageSummary && (
                              <div className="flex w-full items-start gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800 ring-1 ring-blue-100">
                                <Brain className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                                <span className="line-clamp-2">
                                  {sr.aiTriageSummary}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="space-y-3 md:hidden">
                {availableJobs.map((job) => {
                  const sr = job.serviceRequest as any;
                  const commercialIndicator = getJobCommercialIndicator(job as any);
                  return (
                    <Card key={job.id}>
                      <CardContent className="py-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">
                              {sr.referenceNumber}
                            </span>
                            <Badge variant={getUrgencyColor(sr.urgency)}>{sr.urgency}</Badge>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {getServiceCategoryLabel(serviceCategories, sr.category)}
                            </span>
                            {commercialIndicator && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${commercialIndicator.className}`}
                              >
                                {commercialIndicator.label}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="font-medium">{sr.property.name}</span>
                          </div>

                          {sr.property.address && (
                            <p className="text-xs text-gray-500">{sr.property.address}</p>
                          )}

                          <p className="line-clamp-2 text-sm text-gray-600">{sr.description}</p>
                          {sr.aiTriageSummary && (
                            <div className="inline-flex max-w-full items-start gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800 ring-1 ring-blue-100">
                              <Brain className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                              <span className="line-clamp-2">
                                {sr.aiTriageSummary}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <ImageIcon className="h-3.5 w-3.5" />
                              {sr._count.photos} photo{sr._count.photos !== 1 ? "s" : ""}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Posted {formatDate(sr.createdAt)}
                            </span>
                          </div>

                          <div className="grid w-full grid-cols-3 gap-2">
                            <Link href={`/app/vendor/jobs/${job.id}`} className="flex-shrink-0">
                              <button
                                aria-label={`Open details for ${sr.referenceNumber}`}
                                className="inline-flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open
                              </button>
                            </Link>
                            <VendorJobActions jobId={job.id} mode="available" layout="compact" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                <p className="text-sm">No active jobs. Accept one from Available Jobs.</p>
              </CardContent>
            </Card>
          ) : (
            activeJobs.map((job) => {
              const sr = job.serviceRequest as any;
              const commercialIndicator = getJobCommercialIndicator(job as any);
              const sitePhone =
                sr.siteContactPhone ??
                sr.property?.contactPhone ??
                sr.organization?.contactPhone ??
                null;
              const siteContactLabel =
                sr.siteContactName ??
                sr.property?.contactName ??
                sr.organization?.name ??
                "Site contact";
              const hasRejection = !!sr.rejectionReason;
              const isPaused = !!(job as any).isPaused;
              const borderClass = hasRejection ? "border-amber-300" : isPaused ? "border-orange-300" : "";
              return (
                <Card key={job.id} className={borderClass}>
                  <CardContent className="px-4 py-4 md:py-3.5">
                    {isPaused && (
                      <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                        <PauseCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-orange-800">Paused - Will Return</p>
                          {(job as any).pauseReason && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-orange-700">{(job as any).pauseReason}</p>
                          )}
                          {(job as any).estimatedReturnDate && (
                            <p className="mt-0.5 text-xs text-orange-600">
                              Expected return: {formatDate((job as any).estimatedReturnDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {hasRejection && (
                      <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <RotateCcw className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-800">Work sent back for rework</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-amber-700">{sr.rejectionReason}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5 md:space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <span className="text-sm font-semibold text-gray-900">{sr.referenceNumber}</span>
                          <Badge variant={getStatusColor(sr.status)}>{getStatusLabel(sr.status)}</Badge>
                          <Badge variant={getUrgencyColor(sr.urgency)}>{sr.urgency}</Badge>
                          {isPaused && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                              Paused
                            </span>
                          )}
                          {commercialIndicator && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${commercialIndicator.className}`}
                            >
                              {commercialIndicator.label}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 text-sm text-gray-700 md:flex-row md:items-center md:justify-between md:gap-3">
                          <div className="flex min-w-0 items-center gap-1">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="truncate font-medium">{sr.property.name}</span>
                          </div>
                          {job.acceptedAt && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 md:flex-shrink-0">
                              <Clock className="h-3 w-3" />
                              Accepted {formatDate(job.acceptedAt)}
                            </div>
                          )}
                        </div>

                        <p className="line-clamp-2 text-sm text-gray-600 md:line-clamp-1">{sr.description}</p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-shrink-0">
                        {sitePhone && (
                          <a
                            href={`tel:${sitePhone}`}
                            title={`Call ${siteContactLabel}`}
                            className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-4 w-4" />
                              Call Site
                            </span>
                          </a>
                        )}
                        <Link href={`/app/vendor/jobs/${job.id}`} className="flex-shrink-0">
                          <button className="rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700">
                            View Details
                          </button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "completed" && (
        <div className="space-y-4">
          {completedTotal === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                <p className="text-sm">No completed jobs yet.</p>
              </CardContent>
            </Card>
          ) : (
            completedJobs.map((job) => {
              const sr = job.serviceRequest;
              const commercialIndicator = getJobCommercialIndicator(job as any);
              return (
                <Card key={job.id}>
                  <CardContent className="px-4 py-4 md:py-3.5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5 md:space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <span className="text-sm font-semibold text-gray-900">{sr.referenceNumber}</span>
                          <Badge variant={getStatusColor(sr.status)}>{getStatusLabel(sr.status)}</Badge>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {getServiceCategoryLabel(serviceCategories, sr.category)}
                          </span>
                          {commercialIndicator && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${commercialIndicator.className}`}
                            >
                              {commercialIndicator.label}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 text-sm text-gray-700 md:flex-row md:items-center md:justify-between md:gap-3">
                          <div className="flex min-w-0 items-center gap-1">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="truncate font-medium">{sr.property.name}</span>
                          </div>
                          {job.completedAt && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 md:flex-shrink-0">
                              <Clock className="h-3 w-3" />
                              Completed {formatDate(job.completedAt)}
                            </div>
                          )}
                        </div>
                      </div>

                      <Link href={`/app/vendor/jobs/${job.id}`} className="flex-shrink-0">
                        <button className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800">
                          View Details
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          <PaginationControls
            page={page}
            totalPages={Math.ceil(completedTotal / PAGE_SIZE)}
            basePath="/app/vendor/jobs"
            extraParams={{ tab: "completed" }}
            total={completedTotal}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}
      </div>
    </VendorJobsViewSwipeShell>
  );
}
