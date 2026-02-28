import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Building2 } from "lucide-react";

export const metadata = {
  title: "Organizations | DispatchToGo Admin",
};

const ORG_TYPE_LABELS: Record<string, string> = {
  HOTEL: "Hotel",
  CAMPGROUND: "Campground",
  MARINA: "Marina",
  STR: "Short-Term Rental",
  OTHER: "Other",
};

const ORG_TYPE_COLORS: Record<string, string> = {
  HOTEL: "bg-blue-100 text-blue-700",
  CAMPGROUND: "bg-emerald-100 text-emerald-700",
  MARINA: "bg-cyan-100 text-cyan-700",
  STR: "bg-purple-100 text-purple-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export default async function AdminOrganizationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          properties: true,
          users: true,
          serviceRequests: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {organizations.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No organizations yet.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Contact Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Phone
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Properties
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Users
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Requests
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{org.name}</p>
                      {org.address && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                          {org.address}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          ORG_TYPE_COLORS[org.type] ?? "bg-gray-100 text-gray-600"
                        }
                      >
                        {ORG_TYPE_LABELS[org.type] ?? org.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <a
                        href={`mailto:${org.contactEmail}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {org.contactEmail}
                      </a>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {org.contactPhone ? (
                        <a
                          href={`tel:${org.contactPhone}`}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {org.contactPhone}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center hidden lg:table-cell">
                      <span
                        className={`text-sm font-semibold ${
                          org._count.properties > 0 ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {org._count.properties}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center hidden lg:table-cell">
                      <span
                        className={`text-sm font-semibold ${
                          org._count.users > 0 ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {org._count.users}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell">
                      <span
                        className={`text-sm font-semibold ${
                          org._count.serviceRequests > 0 ? "text-blue-600" : "text-gray-400"
                        }`}
                      >
                        {org._count.serviceRequests}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden xl:table-cell">
                      {formatDate(org.createdAt)}
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
