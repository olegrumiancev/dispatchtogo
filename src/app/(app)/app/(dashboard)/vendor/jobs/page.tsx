import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { REQUEST_STATUSES, SERVICE_CATEGORIES } from "@/lib/constants";

const PAGE_SIZE = 20;

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
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "VENDOR") redirect("/");

  const { page, status } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where: any = { vendorId: user.vendorProfileId };
  if (status) where.serviceRequest = { status };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        serviceRequest: {
          include: { property: true },
        },
        materials: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.job.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildFilterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { page: String(currentPage), status, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "undefined") params.set(k, v);
    }
    params.delete("page");
    if (overrides.page) params.set("page", overrides.page);
    return `?${params.toString()}`;
  }

  function FilterBadge({ label, value }: { label: string; value: string }) {
    const isActive = status === value;
    const href = isActive
      ? buildFilterUrl({ status: undefined, page: "1" })
      : buildFilterUrl({ status: value, page: "1" });
    return (
      <Link
        href={href}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">{total} job{total !== 1 ? "s" : ""} total</p>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filter:</span>
        {REQUEST_STATUSES.map((s) => (
          <FilterBadge key={s.value} label={s.label} value={s.value} />
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No jobs found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const req = job.serviceRequest as any;
            const totalMaterials = job.materials.reduce(
              (sum: number, m: any) => sum + m.unitCost * m.quantity,
              0
            );

            return (
              <Link key={job.id} href={`/app/vendor/jobs/${job.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="p-0 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{req.referenceNumber}</CardTitle>
                      <Badge variant={getStatusColor(req.status)}>{getStatusLabel(req.status)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">{req.description}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400">Property</p>
                        <p className="text-gray-700 font-medium">{req.property.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Category</p>
                        <p className="text-gray-700 font-medium">{getCategoryLabel(req.category)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Assigned</p>
                        <p className="text-gray-700 font-medium">{formatDate(job.createdAt)}</p>
                      </div>
                      {totalMaterials > 0 && (
                        <div>
                          <p className="text-gray-400">Materials</p>
                          <p className="text-gray-700 font-medium">{formatCurrency(totalMaterials)}</p>
                        </div>
                      )}
                    </div>

                    {/* Pause indicator */}
                    {(job as any).isPaused && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                        Paused
                        {(job as any).pauseReason && (
                          <span className="text-amber-500 truncate">— {(job as any).pauseReason}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
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
