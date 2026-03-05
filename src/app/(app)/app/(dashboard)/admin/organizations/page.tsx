import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import ChangePlanButton from "./change-plan-button";
import ChangeTypeButton from "./change-type-button";

export default async function OrganizationsPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          users: true,
          properties: true,
          serviceRequests: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <p className="text-sm text-gray-500 mt-1">
          {organizations.length} organization{organizations.length !== 1 ? "s" : ""} registered
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Organization</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-center px-4 py-3">Users</th>
              <th className="text-center px-4 py-3">Properties</th>
              <th className="text-center px-4 py-3">Requests</th>
              <th className="text-left px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {organizations.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-xs text-gray-400">{org.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <Badge variant="bg-purple-100 text-purple-800">
                      {org.type}
                    </Badge>
                    <ChangeTypeButton orgId={org.id} currentType={org.type} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <Badge
                      variant={
                        org.plan === "ENTERPRISE"
                          ? "bg-amber-100 text-amber-800"
                          : org.plan === "PROFESSIONAL"
                          ? "bg-blue-100 text-blue-800"
                          : org.plan === "BASIC"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {org.plan}
                    </Badge>
                    <ChangePlanButton orgId={org.id} currentPlan={org.plan} />
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {org._count.users}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {org._count.properties}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {org._count.serviceRequests}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {formatDate(org.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
