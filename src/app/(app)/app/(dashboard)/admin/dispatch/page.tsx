import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { URGENCY_LEVELS, REQUEST_STATUSES, SERVICE_CATEGORIES } from "@/lib/constants";
import { AlertTriangle, Eye, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import AssignModal from "./assign-modal";
import { formatDate } from "@/lib/utils";
import { PaginationControls } from "@/components/ui/pagination-controls";

const PAGE_SIZE = 25;
const TERMINAL_STATUSES = ["COMPLETED", "VERIFIED", "CANCELLED"];

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
  org?: string;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  page?: string;
}

export default async function DispatchBoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const urgencyFilter = sp.urgency ?? "";
  const categoryFilter = sp.category ?? "";
  const orgFilter = sp.org ?? "";
  const searchFilter = sp.search ?? "";
  const sortBy = sp.sortBy ?? "createdAt";
  const sortDir = sp.sortDir === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where: any = {};
  if (statusFilter) {
    where.status = statusFilter;
  } else {
    where.status = { notIn: TERMINAL_STATUSES };
  }
  if (urgencyFilter) where.urgency = urgencyFilter;
  if (categoryFilter) where.category = categoryFilter;
  if (orgFilter) where.organizationId = orgFilter;
  if (searchFilter) {
    where.OR = [
      { referenceNumber: { contains: searchFilter, mode: "insensitive" } },
      { description: { contains: searchFilter, mode: "insensitive" } },
      { property: { name: { contains: searchFilter, mode: "insensitive" } } },
    ];
  }

  const orderByMap: Record<string, any> = {
    referenceNumber: { referenceNumber: sortDir },
    org: { organization: { name: sortDir } },
    property: { property: { name: sortDir } },
    category: { category: sortDir },
    urgency: { urgency: sortDir },
    status: { status: sortDir },
    createdAt: { createdAt: sortDir },
  };
  const orderBy = orderByMap[sortBy] ?? { createdAt: "desc" };

  const [total, requests, organizations, disputedRequests, availableVendors] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy,
      include: {
        property: { select: { name: true } },
        organization: { select: { id: true, name: true } },
        job: {
          select: {
            id: true,
            status: true,
            isPaused: true,
            vendor: { select: { companyName: true, phone: true } },
          },
        },
      },
    }),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceRequest.findMany({
      where: { status: "DISPUTED" },
      select: {
        id: true,
        referenceNumber: true,
        urgency: true,
        property: { select: { name: true } },
        job: { select: { vendor: { select: { companyName: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.vendor.findMany({
      where: { isActive: true },
      include: { skills: { select: { category: true } } },
      orderBy: { companyName: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const vendorsForModal = availableVendors.map((v) => ({
    id: v.id,
    companyName: v.companyName,
    phone: v.phone,
    availabilityStatus: v.availabilityStatus,
    availabilityNote: v.availabilityNote,
    skills: v.skills.map((s) => ({ category: s.category })),
  }));

  function buildUrl(params: Record<string, string>) {
    const base: Record<string, string> = {};
    if (statusFilter) base.status = statusFilter;
    if (urgencyFilter) base.urgency = urgencyFilter;
    if (categoryFilter) base.category = categoryFilter;
    if (orgFilter) base.org = orgFilter;
    if (searchFilter) base.search = searchFilter;
    if (sortBy !== "createdAt") base.sortBy = sortBy;
    if (sortDir !== "desc") base.sortDir = sortDir;
    const merged = { ...base, ...params };
    Object.keys(merged).forEach((k) => { if (!merged[k]) delete merged[k]; });
    const qs = new URLSearchParams(merged).toString();
    return `/app/admin/dispatch${qs ? `?${qs}` : ""}`;
  }

  function sortUrl(col: string) {
    const newDir = sortBy === col && sortDir === "asc" ? "desc" : "asc";
    return buildUrl({ sortBy: col, sortDir: newDir, page: "1" });
  }

  const extraParams: Record<string, string> = {};
  if (statusFilter) extraParams.status = statusFilter;
  if (urgencyFilter) extraParams.urgency = urgencyFilter;
  if (categoryFilter) extraParams.category = categoryFilter;
  if (orgFilter) extraParams.org = orgFilter;
  if (searchFilter) extraParams.search = searchFilter;
  if (sortBy !== "createdAt") extraParams.sortBy = sortBy;
  if (sortDir !== "desc") extraParams.sortDir = sortDir;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} request{total !== 1 ? "s" : ""}
            {!statusFilter && " · active only"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Disputed alert banner */}
      {disputedRequests.length > 0 && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-rose-700">
              {disputedRequests.length} disputed request{disputedRequests.length !== 1 ? "s" : ""} — admin action required
            </span>
          </div>
          <div className="flex flex-wrap gap-2 ml-6">
            {disputedRequests.map((req) => (
              <Link
                key={req.id}
                href={`/app/admin/dispatch/${req.id}`}
                className="inline-flex items-center gap-1.5 text-xs bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-md px-2.5 py-1 transition-colors"
              >
                <span className="font-medium">{req.referenceNumber}</span>
                <span className="text-rose-400">·</span>
                {req.property.name}
                {req.job?.vendor && <span className="text-rose-400">· {req.job.vendor.companyName}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <Card>
        <form method="GET" action="/app/admin/dispatch" className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Active (non-terminal)</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
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
          <select
            name="org"
            defaultValue={orgFilter}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Organizations</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          {sortBy !== "createdAt" && <input type="hidden" name="sortBy" value={sortBy} />}
          {sortDir !== "desc" && <input type="hidden" name="sortDir" value={sortDir} />}
          <input
            type="search"
            name="search"
            defaultValue={searchFilter}
            placeholder="Search ref, property, description..."
            className="rounded-md border border-gray-300 px-3 py-2 text-sm flex-1 min-w-0 sm:min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center">
              Filter
            </Button>
            {(statusFilter || urgencyFilter || categoryFilter || orgFilter || searchFilter) && (
              <Link href="/app/admin/dispatch" className="flex-1 sm:flex-none">
                <Button type="button" variant="ghost" size="sm" className="w-full justify-center">
                  Clear
                </Button>
              </Link>
            )}
          </div>
        </form>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {requests.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No requests found.{" "}
              {(statusFilter || urgencyFilter || categoryFilter || orgFilter || searchFilter) && (
                <Link href="/app/admin/dispatch" className="text-blue-600 hover:underline">Clear filters</Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {([
                    { col: "referenceNumber", label: "Ref #",    cls: "" },
                    { col: "org",             label: "Org",      cls: "hidden lg:table-cell" },
                    { col: "property",        label: "Property", cls: "" },
                    { col: "category",        label: "Category", cls: "hidden md:table-cell" },
                    { col: "urgency",         label: "Urgency",  cls: "hidden sm:table-cell" },
                    { col: "status",          label: "Status",   cls: "" },
                  ] as const).map(({ col, label, cls }) => {
                    const active = sortBy === col;
                    const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
                    return (
                      <th key={col} className={`text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${cls}`}>
                        <Link
                          href={sortUrl(col)}
                          className={`inline-flex items-center gap-1 hover:text-gray-800 transition-colors ${active ? "text-gray-800" : ""}`}
                        >
                          {label}
                          <Icon className={`w-3 h-3 ${active ? "text-blue-500" : "text-gray-400"}`} />
                        </Link>
                      </th>
                    );
                  })}
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    <Link href={sortUrl("createdAt")} className={`inline-flex items-center gap-1 hover:text-gray-800 transition-colors ${sortBy === "createdAt" ? "text-gray-800" : ""}`}>
                      Created
                      {sortBy === "createdAt"
                        ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />)
                        : <ChevronsUpDown className="w-3 h-3 text-gray-400" />}
                    </Link>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Vendor</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((req) => {
                  const job = req.job;
                  const isUnassigned = !job || job.status === "DECLINED";
                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        req.status === "DISPUTED" ? "bg-rose-50 hover:bg-rose-100" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/app/admin/dispatch/${req.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {req.referenceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell max-w-[140px] truncate">
                        {req.organization.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-[160px] truncate">
                        {req.property.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                        {getCategoryLabel(req.category)}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <Badge variant={getUrgencyColor(req.urgency)}>{req.urgency}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={getStatusColor(req.status)}>{getStatusLabel(req.status)}</Badge>
                          {job?.isPaused && (
                            <span className="text-xs text-amber-700 font-medium">⏸ Paused</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm hidden md:table-cell">
                        {job && job.status !== "DECLINED" ? (
                          <div>
                            <span className="text-gray-700">{job.vendor.companyName}</span>
                            <a href={`tel:${job.vendor.phone}`} className="block text-xs text-blue-500 hover:text-blue-700">
                              {job.vendor.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isUnassigned && (
                            <AssignModal
                              requestRef={req.referenceNumber}
                              requestId={req.id}
                              vendors={vendorsForModal}
                            />
                          )}
                          <Link href={`/app/admin/dispatch/${req.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              basePath="/app/admin/dispatch"
              extraParams={extraParams}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
