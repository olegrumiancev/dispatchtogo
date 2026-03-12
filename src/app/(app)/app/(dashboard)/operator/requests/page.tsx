import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUSES, URGENCY_LEVELS, BILLING_PLANS, BILLING_JOB_TAG_STYLES } from "@/lib/constants";
import { getServiceCategories, getServiceCategoryLabel } from "@/lib/catalog";
import {
  getAdminOperatorRequestStatusColor,
  getAdminOperatorRequestStatusLabel,
} from "@/lib/admin-operator-request-status";
import { Plus, Eye, ChevronLeft, ChevronRight, Paperclip, ChevronUp, ChevronDown, ChevronsUpDown, Camera } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CancelRequestButton } from "@/components/forms/cancel-request-button";
import { currentPeriodStart, currentPeriodEnd, getOrgBillingRankMap } from "@/lib/billing";
import { RequestsViewToggle } from "@/components/operator/requests-view-toggle";
import { RequestsViewSwipeShell } from "@/components/operator/requests-view-swipe-shell";
import {
  getCommercialIndicator,
  latestQuoteSummaryRelationArgs,
} from "@/lib/quotes";

const PAGE_SIZE = 20;

function getUrgencyColor(urgency: string) {
  return URGENCY_LEVELS.find((u) => u.value === urgency)?.color ?? "bg-gray-100 text-gray-800";
}

const BILLED_STATUSES = new Set(["COMPLETED", "VERIFIED"]);

function getBillingTag(
  job: { id: string; billingStatus: string | null; status: string } | null,
  rankMap: Map<string, "FREE" | "BILLABLE">
): "FREE" | "BILLABLE" | null {
  if (!job || !BILLED_STATUSES.has(job.status)) return null;
  return (job.billingStatus as "FREE" | "BILLABLE" | null) ?? rankMap.get(job.id) ?? null;
}

interface SearchParams {
  status?: string;
  urgency?: string;
  category?: string;
  search?: string;
  property?: string;
  sortBy?: string;
  sortDir?: string;
  page?: string;
  view?: string;
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  const orgId: string = user.organizationId!;
  const serviceCategories = await getServiceCategories();

  const sp = await searchParams;
  const view = sp.view === "cancelled" ? "cancelled" : sp.view === "completed" ? "completed" : "active";
  const statusFilter = sp.status ?? "";
  const urgencyFilter = sp.urgency ?? "";
  const categoryFilter = sp.category ?? "";
  const searchFilter = sp.search ?? "";
  const propertyFilter = sp.property ?? "";
  const sortBy = sp.sortBy ?? "createdAt";
  const sortDir = sp.sortDir === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  // Build Prisma where clause
  const where: any = { organizationId: orgId };

  // Cancelled view: CANCELLED only; completed view: COMPLETED + VERIFIED; active view: everything else
  if (view === "cancelled") {
    where.status = "CANCELLED";
  } else if (view === "completed") {
    where.status = { in: ["COMPLETED", "VERIFIED"] };
  } else if (statusFilter) {
    where.status = statusFilter;
  } else {
    where.status = { notIn: ["CANCELLED", "COMPLETED", "VERIFIED"] };
  }
  if (urgencyFilter) where.urgency = urgencyFilter;
  if (categoryFilter) where.category = categoryFilter;
  if (propertyFilter) where.propertyId = propertyFilter;
  if (searchFilter) {
    where.OR = [
      { referenceNumber: { contains: searchFilter, mode: "insensitive" } },
      { description: { contains: searchFilter, mode: "insensitive" } },
      { property: { name: { contains: searchFilter, mode: "insensitive" } } },
    ];
  }

  // Build Prisma orderBy from sort params
  const orderByMap: Record<string, any> = {
    referenceNumber: { referenceNumber: sortDir },
    property: { property: { name: sortDir } },
    category: { category: sortDir },
    urgency: { urgency: sortDir },
    status: { status: sortDir },
    createdAt: { createdAt: sortDir },
  };
  const orderBy = orderByMap[sortBy] ?? { createdAt: "desc" };

  const periodStart = currentPeriodStart();
  const periodEnd = currentPeriodEnd();

  const [total, requests, org, submittedThisMonth, billingRankMap] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy,
      include: {
        property: { select: { id: true, name: true } },
        quotes: latestQuoteSummaryRelationArgs,
        job: {
          include: {
            vendor: { select: { companyName: true } },
            notes: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
            _count: { select: { photos: true } },
          },
        },
        requestViews: { where: { userId: user.id }, select: { viewedAt: true } },
        _count: { select: { photos: true } },
      },
    }),
    prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { plan: true },
    }),
    prisma.serviceRequest.count({
      where: { organizationId: orgId, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    getOrgBillingRankMap(orgId, periodStart, periodEnd),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const planIncluded = (BILLING_PLANS[org.plan] ?? BILLING_PLANS["FREE"]).includedRequests;

  // Compute new-activity flag per request
  const requestsWithActivity = requests.map((req) => {
    const job = req.job;
    const viewedAt = req.requestViews[0]?.viewedAt;
    const latestActivity = (
      [job?.enRouteAt, job?.arrivedAt, job?.completedAt, job?.notes[0]?.createdAt] as (Date | null | undefined)[]
    ).reduce<Date | null>((max, d) => {
      if (!d) return max;
      return !max || d > max ? d : max;
    }, null);
    const hasNewActivity = !!latestActivity && (!viewedAt || latestActivity > viewedAt);
    const commercialIndicator = getCommercialIndicator({
      quotePolicy: req.quotePolicy,
      quoteDisposition: req.job?.quoteDisposition,
      quotes: req.quotes,
    });
    return { ...req, hasNewActivity, commercialIndicator };
  });

  // Resolve property name for filter pill if filtering by property
  const propertyName = propertyFilter
    ? (await prisma.property.findFirst({ where: { id: propertyFilter, organizationId: orgId }, select: { name: true } }))?.name ?? null
    : null;

  // Build URL helpers that preserve existing filters
  function buildUrl(params: Record<string, string>) {
    const base: Record<string, string> = {};
    if (view === "cancelled") base.view = "cancelled";
    else if (view === "completed") base.view = "completed";
    if (statusFilter && view === "active") base.status = statusFilter;
    if (urgencyFilter) base.urgency = urgencyFilter;
    if (categoryFilter) base.category = categoryFilter;
    if (searchFilter) base.search = searchFilter;
    if (propertyFilter) base.property = propertyFilter;
    if (sortBy !== "createdAt") base.sortBy = sortBy;
    if (sortDir !== "desc") base.sortDir = sortDir;
    const merged = { ...base, ...params };
    // Drop empty-string values; drop view=active (it's the default)
    Object.keys(merged).forEach((k) => {
      if (!merged[k] || (k === "view" && merged[k] === "active")) delete merged[k];
    });
    const qs = new URLSearchParams(merged).toString();
    return `/app/operator/requests${qs ? `?${qs}` : ""}`;
  }

  // Helper to build sort URL for a column (toggles dir if already active)
  function sortUrl(col: string) {
    const newDir = sortBy === col && sortDir === "asc" ? "desc" : "asc";
    return buildUrl({ sortBy: col, sortDir: newDir, page: "1" });
  }

  // URL that clears the property filter but keeps other active filters
  const clearPropertyUrl = buildUrl({ property: "", page: "1" });
  const hasActiveFilters = Boolean(
    propertyFilter ||
      searchFilter ||
      urgencyFilter ||
      categoryFilter ||
      (view === "active" && statusFilter)
  );
  const activeFilterCount = [
    propertyFilter,
    searchFilter,
    urgencyFilter,
    categoryFilter,
    view === "active" ? statusFilter : "",
  ].filter(Boolean).length;
  const viewLinks = {
    active: buildUrl({ view: "active", status: "", page: "1" }),
    completed: buildUrl({ view: "completed", status: "", page: "1" }),
    cancelled: buildUrl({ view: "cancelled", status: "", page: "1" }),
  };

  return (
    <RequestsViewSwipeShell view={view} links={viewLinks}>
      <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} total request{total !== 1 ? "s" : ""}
            {" · "}
            <span className={submittedThisMonth >= planIncluded ? "text-amber-600 font-medium" : ""}>
              {submittedThisMonth} of {planIncluded} free this month
            </span>
          </p>
        </div>
        <Link href="/app/operator/requests/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Active / Completed / Cancelled toggle */}
      <RequestsViewToggle view={view} links={viewLinks} />

      {/* Filter bar — uses GET form for server-side filtering */}
      <Card>
        <details
          className="group [&_summary::-webkit-details-marker]:hidden sm:[&:not([open])>.filters-panel]:block"
          open={hasActiveFilters}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-900 sm:hidden">
            <span className="inline-flex items-center gap-2">
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {activeFilterCount} active
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="filters-panel hidden border-t border-gray-200 group-open:block sm:border-t-0">
            <form method="GET" action="/app/operator/requests" className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          {view === "cancelled" && <input type="hidden" name="view" value="cancelled" />}
          {view === "completed" && <input type="hidden" name="view" value="completed" />}
          {view === "active" && (
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {REQUEST_STATUSES.filter((s) => !["CANCELLED", "COMPLETED", "VERIFIED"].includes(s.value)).map((s) => (
                <option key={s.value} value={s.value}>{getAdminOperatorRequestStatusLabel(s.value)}</option>
              ))}
            </select>
          )}
          <select
            name="urgency"
            defaultValue={urgencyFilter}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Urgencies</option>
            {URGENCY_LEVELS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={categoryFilter}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {serviceCategories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {/* preserve sort state across filter submissions */}
          {sortBy !== "createdAt" && <input type="hidden" name="sortBy" value={sortBy} />}
          {sortDir !== "desc" && <input type="hidden" name="sortDir" value={sortDir} />}
          {propertyFilter && <input type="hidden" name="property" value={propertyFilter} />}
          <input
            type="search"
            name="search"
            defaultValue={searchFilter}
            placeholder="Search by ref, property, description..."
            className="rounded-md border border-gray-300 px-3 py-2 text-sm flex-1 min-w-0 sm:min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center">
              Filter
            </Button>
            {(statusFilter || urgencyFilter || categoryFilter || searchFilter) && (
              <Link href={buildUrl({ status: "", urgency: "", category: "", search: "", page: "1" })} className="flex-1 sm:flex-none">
                <Button type="button" variant="ghost" size="sm" className="w-full justify-center">
                  Clear
                </Button>
              </Link>
            )}
          </div>
        </form>
        {(propertyName || (statusFilter && view === "active") || urgencyFilter || categoryFilter) && (
          <div className="px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {propertyName && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                Property: {propertyName}
                <Link
                  href={clearPropertyUrl}
                  className="hover:text-blue-900 ml-0.5"
                  aria-label="Clear property filter"
                >
                  ×
                </Link>
              </span>
            )}
            {categoryFilter && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                Category: {getServiceCategoryLabel(serviceCategories, categoryFilter)}
                <Link
                  href={buildUrl({ category: "", page: "1" })}
                  className="hover:text-blue-900 ml-0.5"
                  aria-label="Clear category filter"
                >
                  ×
                </Link>
              </span>
            )}
            {urgencyFilter && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                Urgency: {urgencyFilter}
                <Link
                  href={buildUrl({ urgency: "", page: "1" })}
                  className="hover:text-blue-900 ml-0.5"
                  aria-label="Clear urgency filter"
                >
                  ×
                </Link>
              </span>
            )}
            {statusFilter && view === "active" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                Status: {getAdminOperatorRequestStatusLabel(statusFilter)}
                <Link
                  href={buildUrl({ status: "", page: "1" })}
                  className="hover:text-blue-900 ml-0.5"
                  aria-label="Clear status filter"
                >
                  ×
                </Link>
              </span>
            )}
          </div>
        )}
          </div>
        </details>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {requestsWithActivity.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 sm:px-6 sm:py-12">
              No requests found.{" "}
              {statusFilter || urgencyFilter || searchFilter ? (
                <Link href="/app/operator/requests" className="text-blue-600 hover:underline">Clear filters</Link>
              ) : (
                <Link href="/app/operator/requests/new" className="text-blue-600 hover:underline">Create one</Link>
              )}
            </div>
          ) : (
            <table className="w-full table-fixed sm:table-auto">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {([
                    { col: "referenceNumber", label: "Ref #", cls: "w-[34%] sm:w-auto" },
                    { col: "property", label: "Property", cls: "w-[28%] sm:w-auto" },
                    { col: "category", label: "Category", cls: "hidden md:table-cell" },
                    { col: "urgency", label: "Urgency", cls: "hidden sm:table-cell" },
                    { col: "status", label: "Status", cls: "w-[24%] sm:w-auto" },
                    { col: "createdAt", label: "Created", cls: "hidden lg:table-cell" },
                  ] as const).map(({ col, label, cls }) => {
                    const active = sortBy === col;
                    const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
                    return (
                      <th
                        key={col}
                        className={`px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3 ${cls}`}
                      >
                        <Link
                          href={sortUrl(col)}
                          className={`inline-flex items-center gap-1 hover:text-gray-800 transition-colors ${
                            active ? "text-gray-800" : ""
                          }`}
                        >
                          {label}
                          <Icon className={`w-3 h-3 ${active ? "text-blue-500" : "text-gray-400"}`} />
                        </Link>
                      </th>
                    );
                  })}
                  <th className="w-[14%] px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:w-auto sm:px-6 sm:py-3">
                    <span className="sm:hidden">Act</span>
                    <span className="hidden sm:inline">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requestsWithActivity.map((req) => (
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
                        {req._count.photos > 0 && (
                          <span title={`${req._count.photos} intake photo${req._count.photos !== 1 ? "s" : ""}`}>
                            <Paperclip className="w-3 h-3 text-gray-400" />
                          </span>
                        )}
                        {(req.job?._count?.photos ?? 0) > 0 && (
                          <span title={`${req.job!._count!.photos} vendor photo${req.job!._count!.photos !== 1 ? "s" : ""}`}>
                            <Camera className="w-3 h-3 text-teal-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[110px] px-3 py-3 align-top text-sm sm:max-w-[160px] sm:px-6 sm:py-4">
                      <Link
                        href={buildUrl({ property: req.property.id, page: "1" })}
                        className="text-gray-700 hover:text-blue-600 hover:underline cursor-pointer"
                        title={`Filter by property: ${req.property.name}`}
                      >
                        {req.property.name}
                      </Link>
                    </td>
                    <td className="hidden px-6 py-4 text-sm md:table-cell">
                      <Link
                        href={buildUrl({ category: req.category, page: "1" })}
                        className="text-gray-500 hover:text-blue-600 hover:underline cursor-pointer"
                        title={`Filter by category: ${getServiceCategoryLabel(serviceCategories, req.category)}`}
                      >
                        {getServiceCategoryLabel(serviceCategories, req.category)}
                      </Link>
                    </td>
                    <td className="hidden px-6 py-4 sm:table-cell">
                      <Link
                        href={buildUrl({ urgency: req.urgency, page: "1" })}
                        title={`Filter by urgency: ${req.urgency}`}
                      >
                        <Badge variant={getUrgencyColor(req.urgency)} className="cursor-pointer hover:opacity-80 transition-opacity">{req.urgency}</Badge>
                      </Link>
                    </td>
                    <td className="px-3 py-3 align-top sm:px-6 sm:py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <Link
                          href={buildUrl({ status: req.status, page: "1" })}
                          title={`Filter by status: ${getAdminOperatorRequestStatusLabel(req.status)}`}
                        >
                          <Badge
                            variant={getAdminOperatorRequestStatusColor(req.status)}
                            className="cursor-pointer px-2 py-0 text-[11px] leading-4 hover:opacity-80 transition-opacity sm:whitespace-nowrap sm:px-2.5 sm:py-0.5 sm:text-xs"
                          >
                            {getAdminOperatorRequestStatusLabel(req.status)}
                          </Badge>
                        </Link>
                        {(() => {
                          const tag = getBillingTag(req.job, billingRankMap);
                          if (!tag) return null;
                          const style = BILLING_JOB_TAG_STYLES[tag];
                          return (
                            <span className={`inline-flex items-center rounded-full px-2 py-0 text-[11px] font-medium whitespace-nowrap sm:px-2 sm:py-0.5 sm:text-xs ${style.className}`}>
                              {style.label}
                            </span>
                          );
                        })()}
                        {req.commercialIndicator && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0 text-[11px] font-medium whitespace-nowrap sm:px-2 sm:py-0.5 sm:text-xs ${req.commercialIndicator.className}`}
                          >
                            {req.commercialIndicator.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-gray-500 lg:table-cell">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-right align-top sm:px-6 sm:py-4">
                      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
                        {view === "active" && ["SUBMITTED", "TRIAGING", "NEEDS_CLARIFICATION", "READY_TO_DISPATCH"].includes(req.status) && (
                          <CancelRequestButton requestId={req.id} compact />
                        )}
                        <Link href={`/app/operator/requests/${req.id}`}>
                          <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} &mdash; {total} results
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link href={buildUrl({ page: String(page - 1) })}>
                  <Button variant="secondary" size="sm">
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}
              {page < totalPages ? (
                <Link href={buildUrl({ page: String(page + 1) })}>
                  <Button variant="secondary" size="sm">
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
      </div>
    </RequestsViewSwipeShell>
  );
}
