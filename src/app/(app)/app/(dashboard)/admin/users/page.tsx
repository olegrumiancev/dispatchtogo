import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Shield, Building2, Wrench, Clock, Ban } from "lucide-react";
import { UserTableClient } from "./UserTableClient";

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
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: [
      { createdAt: "desc" },
    ],
    include: {
      organization: { select: { name: true } },
      vendor: { select: { companyName: true } },
    },
  });

  // Serialize for client component — pick only needed fields, all dates as ISO strings
  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified,
    isApproved: u.isApproved,
    isDisabled: u.isDisabled,
    rejectedAt: u.rejectedAt?.toISOString() ?? null,
    rejectionNote: u.rejectionNote,
    createdAt: u.createdAt.toISOString(),
    organization: u.organization,
    vendor: u.vendor,
  }));

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

      {/* Users table with tabs, search, sort */}
      <UserTableClient users={serializedUsers} />
    </div>
  );
}
