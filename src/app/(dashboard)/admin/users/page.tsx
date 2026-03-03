import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Users, Shield, Building2, Wrench, Clock, AlertTriangle, Ban } from "lucide-react";
import { UserActions } from "./user-actions";

export const metadata = {
  title: "User Management | DispatchToGo Admin",
};

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ADMIN: { label: "Admin", color: "bg-red-100 text-red-700", icon: Shield },
  OPERATOR: { label: "Operator", color: "bg-blue-100 text-blue-700", icon: Building2 },
  VENDOR: { label: "Vendor", color: "bg-emerald-100 text-emerald-700", icon: Wrench },
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: [
      { isApproved: "asc" },     // Pending first
      { role: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      organization: { select: { name: true } },
      vendor: { select: { companyName: true } },
    },
  });

  const roleCounts = {
    ADMIN: users.filter((u) => u.role === "ADMIN").length,
    OPERATOR: users.filter((u) => u.role === "OPERATOR").length,
    VENDOR: users.filter((u) => u.role === "VENDOR").length,
  };

  const pendingCount = users.filter(
    (u) => u.role !== "ADMIN" && u.emailVerified && !u.isApproved && !u.rejectedAt
  ).length;

  const disabledCount = users.filter((u) => u.isDisabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} user{users.length !== 1 ? "s" : ""} &mdash;{" "}
            {roleCounts.ADMIN} admin, {roleCounts.OPERATOR} operator{roleCounts.OPERATOR !== 1 ? "s" : ""},{" "}
            {roleCounts.VENDOR} vendor{roleCounts.VENDOR !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Pending approval alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingCount}</strong> account{pendingCount !== 1 ? "s" : ""} pending
            your approval.
          </p>
        </div>
      )}

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {(["ADMIN", "OPERATOR", "VENDOR"] as const).map((role) => {
          const cfg = ROLE_CONFIG[role];
          const Icon = cfg.icon;
          return (
            <Card key={role}>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className={`p-2 rounded-lg ${cfg.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{roleCounts[role]}</p>
                  <p className="text-xs text-gray-500">{cfg.label}s</p>
                </div>
              </div>
            </Card>
          );
        })}
        {pendingCount > 0 && (
          <Card>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </Card>
        )}
        {disabledCount > 0 && (
          <Card>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="p-2 rounded-lg bg-gray-200 text-gray-600">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{disabledCount}</p>
                <p className="text-xs text-gray-500">Disabled</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Users table */}
      <Card>
        <div className="overflow-x-auto">
          {users.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No users found.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Organization / Company
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Created
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => {
                  const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.OPERATOR;
                  const isPending = u.role !== "ADMIN" && u.emailVerified && !u.isApproved && !u.rejectedAt;
                  const isRejected = u.rejectedAt !== null;
                  const isUnverified = !u.emailVerified;
                  const isUserDisabled = u.isDisabled;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isPending ? "bg-amber-50 hover:bg-amber-100" : ""
                      } ${isRejected ? "bg-red-50/50 hover:bg-red-50" : ""} ${
                        isUserDisabled ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {u.name || <span className="text-gray-400 italic">No name</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={cfg.color}>{cfg.label}</Badge>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="text-sm text-gray-600">
                          {u.organization?.name ?? u.vendor?.companyName ?? (
                            <span className="text-gray-400">&mdash;</span>
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {u.role === "ADMIN" ? (
                          <Badge variant="bg-emerald-100 text-emerald-700">Active</Badge>
                        ) : isUserDisabled ? (
                          <Badge variant="bg-gray-200 text-gray-600">
                            <Ban className="w-3 h-3 mr-0.5" />
                            Disabled
                          </Badge>
                        ) : isUnverified ? (
                          <Badge variant="bg-gray-200 text-gray-600">Unverified</Badge>
                        ) : isPending ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 mr-0.5" />
                              Pending Approval
                            </Badge>
                          </div>
                        ) : isRejected ? (
                          <div className="space-y-1">
                            <Badge variant="bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3 mr-0.5" />
                              Rejected
                            </Badge>
                            {u.rejectionNote && (
                              <p className="text-xs text-red-600 max-w-[200px] truncate" title={u.rejectionNote}>
                                {u.rejectionNote}
                              </p>
                            )}
                          </div>
                        ) : u.isApproved ? (
                          <Badge variant="bg-emerald-100 text-emerald-700">Active</Badge>
                        ) : (
                          <Badge variant="bg-gray-200 text-gray-600">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <UserActions
                          userId={u.id}
                          userName={u.name ?? ""}
                          userEmail={u.email}
                          isApproved={u.isApproved}
                          isRejected={isRejected}
                          isDisabled={isUserDisabled}
                          isPending={isPending}
                          isAdmin={u.role === "ADMIN"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
