import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUSES, URGENCY_LEVELS, SERVICE_CATEGORIES } from "@/lib/constants";
import { Plus, Eye, ChevronLeft, ChevronRight, Paperclip, ChevronUp, ChevronDown, ChevronsUpDown, Archive, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CancelRequestButton } from "@/components/forms/cancel-request-button";

const PAGE_SIZE = 20;

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

  const sp = await searchParams;
  const view = sp.view === "cancelled" ? "cancelled" : "active";
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

  // Cancelled view always shows only CANCELLED; active view excludes CANCELLED unless a specific status is chosen
  if (view === "cancelled") {
    where.status = "CANCELLED";
  } else if (statusFilter) {
    where.status = statusFilter;
  } else {
    where.status = { not: "CANCELLED" };
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

  const [total, requests] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy,
      include: {
        property: { select: { id: true, name: true } },
        job: {
          include: {
            vendor: { select: { companyName: true } },
            notes: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
          },
        },
        requestViews: { where: { userId: user.id }, select: { viewedAt: true } },
        _count: { select: { photos: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
    return { ...req, hasNewActivity };
  });

  // Resolve property name for filter pill if filtering by property
  const propertyName = propertyFilter
    ? (await prisma.property.findFirst({ where: { id: propertyFilter, organizationId: orgId }, select: { name: true } }))?.name ?? null
    : null;

  // Build URL helpers that preserve existing filters
  function buildUrl(params: Record<string, string>) {
    const base: Record<string, string> = {};
    if (view === "cancelled") base.view = "cancelled";
    if (statusFilter && view !== "cancelled") base.status = statusFilter;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} total request{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/app/operator/requests/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Active / Cancelled toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <Link
          href={buildUrl({ view: "active", status: "", page: "1" })}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "active"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Active
        </Link>
        <Link
          href={buildUrl({ view: "cancelled", status: "", page: "1" })}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "cancelled"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Cancelled
        </Link>
      </div>

      {/* Filter bar — uses GET form for server-side filtering */}
      <Card>
        <form method="GET" action="/app/operator/requests" className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          {view === "cancelled" && <input type="hidden" name="view" value="cancelled" />}
          {view === "active" && (
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {REQUEST_STATUSES.filter((s) => s.value !== "CANCELLED").map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
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
            {SERVICE_CATEGORIES.map((c) => (
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
                Category: {getCategoryLabel(categoryFilter)}
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
                Status: {getStatusLabel(statusFilter)}
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
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {requestsWithActivity.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No requests found.{" "}
              {statusFilter || urgencyFilter || searchFilter ? (
                <Link href="/app/operator/requests" className="text-blue-600 hover:underline">Clear filters</Link>
              ) : (
                <Link href="/app/operator/requests/new" className="text-blue-600 hover:underline">Create one</Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {([
                    { col: "referenceNumber", label: "Ref #",   cls: "" },
                    { col: "property",         label: "Property", cls: "" },
                    { col: "category",         label: "Category", cls: "hidden md:table-cell" },
                    { col: "urgency",          label: "Urgency",  cls: "hidden sm:table-cell" },
                    { col: "status",           label: "Status",   cls: "" },
                    { col: "createdAt",        label: "Created",  cls: "hidden lg:table-cell" },
                  ] as const).map(({ col, label, cls }) => {
                    const active = sortBy === col;
                    const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
                    return (
                      <th key={col} className={`text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${cls}`}>
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
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requestsWithActivity.map((req) => (
                  <tr key={req.id} className={`hover:bg-gray-50 transition-colors ${req.hasNewActivity ? "bg-amber-50 hover:bg-amber-100" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {req.hasNewActivity && (
                          <span
                            title="New vendor activity"
                            className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"
                          />
                        )}
                        <Link
                          href={`/app/operator/requests/${req.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {req.referenceNumber}
                        </Link>
                        {req._count.photos > 0 && (
                          <span title={`${req._count.photos} photo${req._count.photos !== 1 ? "s" : ""}`}>
                            <Paperclip className="w-3 h-3 text-gray-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-[160px] truncate">
                      <Link
                        href={buildUrl({ property: req.property.id, page: "1" })}
                        className="text-gray-700 hover:text-blue-600 hover:underline cursor-pointer"
                        title={`Filter by property: ${req.property.name}`}
                      >
                        {req.property.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm hidden md:table-cell">
                      <Link
                        href={buildUrl({ category: req.category, page: "1" })}
                        className="text-gray-500 hover:text-blue-600 hover:underline cursor-pointer"
                        title={`Filter by category: ${getCategoryLabel(req.category)}`}
                      >
                        {getCategoryLabel(req.category)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <Link
                        href={buildUrl({ urgency: req.urgency, page: "1" })}
                        title={`Filter by urgency: ${req.urgency}`}
                      >
                        <Badge variant={getUrgencyColor(req.urgency)} className="cursor-pointer hover:opacity-80 transition-opacity">{req.urgency}</Badge>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={buildUrl({ status: req.status, page: "1" })}
                        title={`Filter by status: ${getStatusLabel(req.status)}`}
                      >
                        <Badge variant={getStatusColor(req.status)} className="cursor-pointer hover:opacity-80 transition-opacity">{getStatusLabel(req.status)}</Badge>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {view === "active" && ["SUBMITTED", "TRIAGING", "NEEDS_CLARIFICATION", "READY_TO_DISPATCH"].includes(req.status) && (
                          <CancelRequestButton requestId={req.id} compact />
                        )}
                        <Link href={`/app/operator/requests/${req.id}`}>
                          <Button variant="ghost" size="sm">
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
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
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
  );
}
