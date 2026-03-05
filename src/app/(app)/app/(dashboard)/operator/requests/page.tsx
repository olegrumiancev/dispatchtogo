import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUSES, URGENCY_LEVELS, SERVICE_CATEGORIES } from "@/lib/constants";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ExternalLink } from "lucide-react";
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

export default async function OperatorRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; urgency?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const { page, status, urgency, category } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where: any = { organizationId: user.organizationId };
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;
  if (category) where.category = category;

  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: { property: true },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build filter query string helper
  function buildFilterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { page: String(currentPage), status, urgency, category, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "undefined") params.set(k, v);
    }
    params.delete("page"); // reset page on filter change unless explicitly set
    if (overrides.page) params.set("page", overrides.page);
    return `?${params.toString()}`;
  }

  function FilterBadge({ label, paramKey, value }: { label: string; paramKey: string; value: string }) {
    const isActive = { status, urgency, category }[paramKey] === value;
    const href = isActive
      ? buildFilterUrl({ [paramKey]: undefined, page: "1" })
      : buildFilterUrl({ [paramKey]: value, page: "1" });
    return (
      <Link
        href={href}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          isActive
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{total} request{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/app/operator/requests/new"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
        >
          + New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Status</span>
          {REQUEST_STATUSES.map((s) => (
            <FilterBadge key={s.value} label={s.label} paramKey="status" value={s.value} />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Urgency</span>
          {URGENCY_LEVELS.map((u) => (
            <FilterBadge key={u.value} label={u.label} paramKey="urgency" value={u.value} />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Category</span>
          {SERVICE_CATEGORIES.map((c) => (
            <FilterBadge key={c.value} label={c.label} paramKey="category" value={c.value} />
          ))}
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Link
              key={req.id}
              href={`/app/operator/requests/${req.id}`}
              className="block"
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{req.referenceNumber}</span>
                      <Badge variant={getUrgencyColor(req.urgency)}>{req.urgency}</Badge>
                      <Badge variant={getStatusColor(req.status)}>{getStatusLabel(req.status)}</Badge>
                      {!(req as any).viewedByOperator && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{req.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                      <span>{req.property.name}</span>
                      <span>·</span>
                      <span>{getCategoryLabel(req.category)}</span>
                      <span>·</span>
                      <span>{formatDate(req.createdAt)}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          buildUrl={(p) => buildFilterUrl({ page: String(p) })}
        />
      )}
    </div>
  );
}
