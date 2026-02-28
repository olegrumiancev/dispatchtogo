import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUSES, URGENCY_LEVELS, SERVICE_CATEGORIES } from "@/lib/constants";
import { Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

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
  search?: string;
  page?: string;
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  const orgId: string = user.organizationId!;

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const urgencyFilter = sp.urgency ?? "";
  const searchFilter = sp.search ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  // Build Prisma where clause
  const where: any = { organizationId: orgId };

  if (statusFilter) where.status = statusFilter;
  if (urgencyFilter) where.urgency = urgencyFilter;
  if (searchFilter) {
    where.OR = [
      { referenceNumber: { contains: searchFilter, mode: "insensitive" } },
      { description: { contains: searchFilter, mode: "insensitive" } },
      { property: { name: { contains: searchFilter, mode: "insensitive" } } },
    ];
  }

  const [total, requests] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { name: true } },
        job: {
          include: {
            vendor: { select: { companyName: true } },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build URL helpers that preserve existing filters
  function buildUrl(params: Record<string, string>) {
    const base: Record<string, string> = {};
    if (statusFilter) base.status = statusFilter;
    if (urgencyFilter) base.urgency = urgencyFilter;
    if (searchFilter) base.search = searchFilter;
    const merged = { ...base, ...params };
    const qs = new URLSearchParams(merged).toString();
    return `/operator/requests${qs ? `?${qs}` : ""}`;
  }

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
        <Link href="/operator/requests/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Filter bar — uses GET form for server-side filtering */}
      <Card>
        <form method="GET" action="/operator/requests" className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
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
            {(statusFilter || urgencyFilter || searchFilter) && (
              <Link href="/operator/requests" className="flex-1 sm:flex-none">
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
              {statusFilter || urgencyFilter || searchFilter ? (
                <Link href="/operator/requests" className="text-blue-600 hover:underline">Clear filters</Link>
              ) : (
                <Link href="/operator/requests/new" className="text-blue-600 hover:underline">Create one</Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ref #</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Urgency</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/operator/requests/${req.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {req.referenceNumber}
                      </Link>
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
                      <Badge variant={getStatusColor(req.status)}>{getStatusLabel(req.status)}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/operator/requests/${req.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </Link>
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
