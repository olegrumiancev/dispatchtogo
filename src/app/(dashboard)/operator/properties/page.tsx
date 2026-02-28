import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Eye } from "lucide-react";

export const metadata = {
  title: "Properties | DispatchToGo",
};

export default async function PropertiesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  const orgId: string = user.organizationId!;

  const properties = await prisma.property.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: { serviceRequests: true },
      },
    },
  });

  const activeCount = properties.filter((p) => p.isActive).length;
  const inactiveCount = properties.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties.length} propert{properties.length !== 1 ? "ies" : "y"} &mdash;{" "}
            {activeCount} active{inactiveCount > 0 ? `, ${inactiveCount} inactive` : ""}
          </p>
        </div>
        {/* Placeholder button — full form would be added in a future phase */}
        <Button variant="primary">
          <Plus className="w-4 h-4" />
          Add Property
        </Button>
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Address
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Description
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Requests
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
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
                      <p className="text-sm text-gray-500 max-w-[220px] truncate">
                        {property.description ?? <span className="text-gray-400">—</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell">
                      <Link
                        href={`/operator/requests?property=${property.id}`}
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
                      <Link href={`/operator/requests?property=${property.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View Requests</span>
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
