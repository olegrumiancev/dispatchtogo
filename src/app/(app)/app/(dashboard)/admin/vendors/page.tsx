import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminAccountsSubnav } from "@/components/admin/accounts-subnav";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SERVICE_CATEGORIES, VENDOR_AVAILABILITY_STATUSES } from "@/lib/constants";
import { getVendorStatusMeta } from "@/lib/vendor-lifecycle";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Eye,
  LayoutGrid,
  List,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
} from "lucide-react";

const PAGE_SIZE = 24;

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function getAvailabilityConfig(status: string) {
  return VENDOR_AVAILABILITY_STATUSES.find((s) => s.value === status) ?? VENDOR_AVAILABILITY_STATUSES[0];
}

const AVAILABILITY_ICONS: Record<string, React.ReactNode> = {
  AVAILABLE: <CheckCircle className="h-3 w-3" />,
  BUSY: <Clock className="h-3 w-3" />,
  OFF_DUTY: <Moon className="h-3 w-3" />,
};

type VendorView = "table" | "gallery";
type VendorState = "all" | "active" | "suspended" | "offboarded";

interface VendorsSearchParams {
  page?: string;
  vendor?: string;
  view?: string;
  q?: string;
  availability?: string;
  category?: string;
  state?: string;
}

function getCredentialMeta(credentials: Array<{ verified: boolean }>) {
  const pendingCount = credentials.filter((c) => !c.verified).length;

  if (credentials.length === 0) {
    return {
      label: "No credentials",
      className: "text-gray-400",
      badge: "bg-gray-100 text-gray-600",
    };
  }

  if (pendingCount > 0) {
    return {
      label: `${pendingCount} pending`,
      className: "text-amber-700",
      badge: "bg-amber-100 text-amber-800",
    };
  }

  return {
    label: "Verified",
    className: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
  };
}

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<VendorsSearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const vendorFilter = sp.vendor ?? "";
  const query = sp.q?.trim() ?? "";
  const availabilityFilter =
    typeof sp.availability === "string" && VENDOR_AVAILABILITY_STATUSES.some((s) => s.value === sp.availability)
      ? sp.availability
      : "";
  const categoryFilter =
    typeof sp.category === "string" && SERVICE_CATEGORIES.some((c) => c.value === sp.category)
      ? sp.category
      : "";
  const stateFilter: VendorState =
    sp.state === "active" || sp.state === "suspended" || sp.state === "offboarded"
      ? sp.state
      : "all";
  const view: VendorView = sp.view === "gallery" ? "gallery" : "table";

  const where: any = {};
  if (vendorFilter) where.id = vendorFilter;
  if (availabilityFilter) where.availabilityStatus = availabilityFilter;
  if (categoryFilter) where.skills = { some: { category: categoryFilter } };
  if (stateFilter === "active") where.status = "ACTIVE";
  if (stateFilter === "suspended") where.status = "SUSPENDED";
  if (stateFilter === "offboarded") where.status = "OFFBOARDED";
  if (query) {
    where.OR = [
      { companyName: { contains: query, mode: "insensitive" } },
      { contactName: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
    ];
  }

  const [total, vendors] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        skills: true,
        credentials: { select: { id: true, verified: true } },
        _count: { select: { jobs: true, user: true } },
      },
      orderBy: [{ companyName: "asc" }],
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const vendorIds = vendors.map((vendor) => vendor.id);
  const activeJobCounts = vendorIds.length
    ? await prisma.job.groupBy({
        by: ["vendorId"],
        where: { completedAt: null, vendorId: { in: vendorIds } },
        _count: { id: true },
      })
    : [];
  const activeJobMap = new Map(activeJobCounts.map((row) => [row.vendorId, row._count.id]));

  const extraParams: Record<string, string> = {};
  if (vendorFilter) extraParams.vendor = vendorFilter;
  if (query) extraParams.q = query;
  if (availabilityFilter) extraParams.availability = availabilityFilter;
  if (categoryFilter) extraParams.category = categoryFilter;
  if (stateFilter !== "all") extraParams.state = stateFilter;
  if (view !== "table") extraParams.view = view;

  function buildUrl(params: Record<string, string>) {
    const merged = { ...extraParams, ...params };
    Object.keys(merged).forEach((key) => {
      if (!merged[key]) delete merged[key];
      if (key === "view" && merged[key] === "table") delete merged[key];
      if (key === "state" && merged[key] === "all") delete merged[key];
    });
    const qs = new URLSearchParams(merged).toString();
    return `/app/admin/vendors${qs ? `?${qs}` : ""}`;
  }

  const hasFilters = !!(vendorFilter || query || availabilityFilter || categoryFilter || stateFilter !== "all");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} vendor{total !== 1 ? "s" : ""} matching the current filters
          </p>
        </div>
        <div className="inline-flex w-fit items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
          <Link
            href={buildUrl({ view: "table", page: "1" })}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="h-4 w-4" />
            Table
          </Link>
          <Link
            href={buildUrl({ view: "gallery", page: "1" })}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "gallery" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Gallery
          </Link>
        </div>
      </div>

      <AdminAccountsSubnav />

      {vendorFilter && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Showing a linked vendor record.
          <Link href={buildUrl({ vendor: "", page: "1" })} className="font-medium text-blue-700 hover:text-blue-900">
            Clear exact match
          </Link>
        </div>
      )}

      <Card>
        <form method="GET" action="/app/admin/vendors" className="flex flex-col gap-3 px-4 py-4 sm:px-6">
          {vendorFilter && <input type="hidden" name="vendor" value={vendorFilter} />}
          {view !== "table" && <input type="hidden" name="view" value={view} />}
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search company, contact, email, phone..."
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              name="state"
              defaultValue={stateFilter}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All lifecycle states</option>
              <option value="active">Active only</option>
              <option value="suspended">Suspended only</option>
              <option value="offboarded">Offboarded only</option>
            </select>
            <select
              name="availability"
              defaultValue={availabilityFilter}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All availability</option>
              {VENDOR_AVAILABILITY_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All skills</option>
              {SERVICE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" size="sm" className="flex-1 justify-center sm:flex-none">
                Filter
              </Button>
              {hasFilters && (
                <Link href={buildUrl({ vendor: "", q: "", availability: "", category: "", state: "all", page: "1" })} className="flex-1 sm:flex-none">
                  <Button type="button" variant="ghost" size="sm" className="w-full justify-center">
                    Clear
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </form>
      </Card>

      {vendors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-gray-500">No vendors matched these filters.</p>
          </CardContent>
        </Card>
      ) : view === "table" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">Skills</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Jobs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden md:table-cell">Credentials</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden md:table-cell">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden xl:table-cell">Contact</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendors.map((vendor) => {
                  const availability = getAvailabilityConfig(vendor.availabilityStatus);
                  const activeJobs = activeJobMap.get(vendor.id) ?? 0;
                  const credentialMeta = getCredentialMeta(vendor.credentials);
                  const vendorStatus = getVendorStatusMeta(vendor.status);

                  return (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          <Link href={`/app/admin/vendors/${vendor.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                            {vendor.companyName}
                          </Link>
                          <p className="text-xs text-gray-500">{vendor.contactName}</p>
                          {vendor.availabilityNote && vendor.availabilityStatus !== "AVAILABLE" && (
                            <p className="max-w-[240px] truncate text-xs italic text-gray-400">{vendor.availabilityNote}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-2">
                          <Badge variant={vendorStatus.color}>{vendorStatus.label}</Badge>
                          {vendor.status === "ACTIVE" && (
                            <Badge variant={availability.color}>
                              <span className="mr-1 inline-flex">{AVAILABILITY_ICONS[vendor.availabilityStatus]}</span>
                              {availability.label}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 align-top lg:table-cell">
                        <div className="flex max-w-[260px] flex-wrap gap-1">
                          {vendor.skills.length > 0 ? (
                            vendor.skills.map((skill) => (
                              <Badge key={skill.id} className="bg-blue-50 text-blue-700 text-xs">
                                {getCategoryLabel(skill.category)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">No skills listed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-gray-900">{vendor._count.jobs} total</p>
                          <p className={activeJobs > 0 ? "text-blue-600" : "text-gray-400"}>
                            {activeJobs} active
                          </p>
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 align-top md:table-cell">
                        <Link href={`/app/admin/vendors/${vendor.id}`}>
                          <Badge variant={credentialMeta.badge} className="cursor-pointer hover:opacity-85">
                            {credentialMeta.label}
                          </Badge>
                        </Link>
                      </td>
                      <td className="hidden px-6 py-4 align-top md:table-cell">
                        <Link href={`/app/admin/users?vendor=${vendor.id}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                          {vendor._count.user} user account{vendor._count.user !== 1 ? "s" : ""}
                        </Link>
                      </td>
                      <td className="hidden px-6 py-4 align-top xl:table-cell">
                        <div className="space-y-1 text-sm text-gray-600">
                          <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 hover:text-blue-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {vendor.phone}
                          </a>
                          <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 hover:text-blue-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{vendor.email}</span>
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-top">
                        <Link href={`/app/admin/vendors/${vendor.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {vendors.map((vendor) => {
            const availability = getAvailabilityConfig(vendor.availabilityStatus);
            const activeJobs = activeJobMap.get(vendor.id) ?? 0;
            const credentialMeta = getCredentialMeta(vendor.credentials);
            const vendorStatus = getVendorStatusMeta(vendor.status);

            return (
              <Card key={vendor.id} className="overflow-hidden">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/app/admin/vendors/${vendor.id}`} className="block truncate text-sm font-semibold text-gray-900 hover:text-blue-700">
                        {vendor.companyName}
                      </Link>
                      <p className="truncate text-xs text-gray-500">{vendor.contactName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={vendorStatus.color} className="shrink-0">
                        {vendorStatus.label}
                      </Badge>
                      {vendor.status === "ACTIVE" && (
                        <Badge variant={availability.color} className="shrink-0">
                          <span className="mr-1 inline-flex">{AVAILABILITY_ICONS[vendor.availabilityStatus]}</span>
                          {availability.label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 px-3 py-2 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Jobs</p>
                      <p className="text-sm font-semibold text-gray-900">{vendor._count.jobs}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Active</p>
                      <p className={`text-sm font-semibold ${activeJobs > 0 ? "text-blue-600" : "text-gray-500"}`}>{activeJobs}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Users</p>
                      <p className="text-sm font-semibold text-gray-900">{vendor._count.user}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <a href={`tel:${vendor.phone}`} className="flex items-center gap-1.5 truncate hover:text-blue-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {vendor.phone}
                    </a>
                    <a href={`mailto:${vendor.email}`} className="flex items-center gap-1.5 truncate hover:text-blue-600">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      {vendor.email}
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {vendor.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill.id} className="bg-blue-50 text-blue-700 text-[11px]">
                        {getCategoryLabel(skill.category)}
                      </Badge>
                    ))}
                    {vendor.skills.length > 3 && (
                      <Badge className="bg-gray-100 text-gray-600 text-[11px]">
                        +{vendor.skills.length - 3} more
                      </Badge>
                    )}
                    {vendor.skills.length === 0 && (
                      <span className="text-xs text-gray-400">No skills listed</span>
                    )}
                  </div>

                  {vendor.availabilityNote && vendor.availabilityStatus !== "AVAILABLE" && (
                    <p className="line-clamp-2 text-xs italic text-gray-500">{vendor.availabilityNote}</p>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                    <Link href={`/app/admin/vendors/${vendor.id}`}>
                      <Badge variant={credentialMeta.badge} className="cursor-pointer hover:opacity-85">
                        {credentialMeta.label}
                      </Badge>
                    </Link>
                    <div className="flex items-center gap-3 text-xs">
                      <Link href={`/app/admin/users?vendor=${vendor.id}`} className="text-blue-600 hover:text-blue-800">
                        Accounts
                      </Link>
                      <Link href={`/app/admin/vendors/${vendor.id}`} className="text-blue-600 hover:text-blue-800">
                        Details
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/app/admin/vendors"
        extraParams={extraParams}
        total={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
