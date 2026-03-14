import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Building2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { AddPropertyDialog } from "@/components/forms/add-property-dialog";
import { PropertyActions } from "@/components/forms/property-actions";
import { PaginationControls } from "@/components/ui/pagination-controls";

const ACTIVE_STATUSES = [
  "SUBMITTED",
  "TRIAGING",
  "NEEDS_CLARIFICATION",
  "READY_TO_DISPATCH",
  "DISPATCHED",
  "ACCEPTED",
  "IN_PROGRESS",
] as const;

const PAGE_SIZE = 25;

export const metadata = {
  title: "Properties | DispatchToGo",
};

interface SearchParams {
  sortBy?: string;
  sortDir?: string;
  page?: string;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  const orgId: string = user.organizationId!;

  const sp = await searchParams;
  const sortBy = sp.sortBy ?? "name";
  const sortDir = sp.sortDir === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const orderByMap: Record<string, any> = {
    name:        { name: sortDir },
    address:     { address: sortDir },
    contact:     { contactName: sortDir },
    requests:    { serviceRequests: { _count: sortDir } },
    status:      { isActive: sortDir === "asc" ? "desc" : "asc" }, // asc = Active first
  };
  const orderBy = orderByMap[sortBy] ?? { name: "asc" };

  function sortUrl(col: string) {
    const newDir =
      sortBy === col ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    const p: Record<string, string> = { sortBy: col, sortDir: newDir };
    return `/app/operator/properties?${new URLSearchParams(p).toString()}`;
  }

  const [total, activeCount, properties] = await Promise.all([
    prisma.property.count({ where: { organizationId: orgId } }),
    prisma.property.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.property.findMany({
      where: { organizationId: orgId },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { serviceRequests: true } },
        serviceRequests: {
          where: { status: { in: [...ACTIVE_STATUSES] } },
          select: { id: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const inactiveCount = total - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} propert{total !== 1 ? "ies" : "y"} &mdash;{" "}
            {activeCount} active{inactiveCount > 0 ? `, ${inactiveCount} inactive` : ""}
          </p>
        </div>
        <AddPropertyDialog />
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {properties.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No properties yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Add a property to start managing service requests.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {([
                    { col: "name",        label: "Property Name", cls: "" },
                    { col: "address",     label: "Address",       cls: "hidden md:table-cell" },
                    { col: "contact",     label: "Site Contact",  cls: "hidden lg:table-cell" },
                    { col: "requests",    label: "Requests",      cls: "hidden sm:table-cell text-center" },
                    { col: "status",      label: "Status",        cls: "" },
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
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{property.name}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-600 max-w-[200px] truncate">
                        {property.address ?? <span className="text-gray-400">—</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {property.contactName || property.contactPhone || property.contactEmail ? (
                        <div className="max-w-[220px]">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {property.contactName || "Site contact"}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {property.contactPhone || property.contactEmail || "Contact details saved"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Uses org default</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell">
                      <Link
                        href={`/app/operator/requests?property=${property.id}`}
                        className={`text-sm font-semibold ${
                          property._count.serviceRequests > 0
                            ? "text-blue-600 hover:text-blue-700"
                            : "text-gray-400"
                        }`}
                      >
                        {property._count.serviceRequests}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          property.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }
                      >
                        {property.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/app/operator/requests?property=${property.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Requests</span>
                          </Button>
                        </Link>
                        <PropertyActions
                          propertyId={property.id}
                          propertyName={property.name}
                          propertyAddress={property.address}
                          propertyDescription={property.description}
                          isActive={property.isActive}
                          activeRequestCount={property.serviceRequests.length}
                          contactName={property.contactName}
                          contactPhone={property.contactPhone}
                          contactEmail={property.contactEmail}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/app/operator/properties"
        extraParams={{ sortBy, sortDir }}
        total={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
