"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Shield,
  Building2,
  Wrench,
  Clock,
  AlertTriangle,
  Ban,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { UserActions } from "./user-actions";

export interface SerializedUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: boolean;
  isApproved: boolean;
  isDisabled: boolean;
  rejectedAt: string | null;
  rejectionNote: string | null;
  createdAt: string;
  organization: { name: string } | null;
  vendor: { companyName: string } | null;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ADMIN: { label: "Admin", color: "bg-red-100 text-red-700", icon: Shield },
  OPERATOR: { label: "Operator", color: "bg-blue-100 text-blue-700", icon: Building2 },
  VENDOR: { label: "Vendor", color: "bg-emerald-100 text-emerald-700", icon: Wrench },
};

type SortField = "name" | "email" | "role" | "createdAt";
type SortDir = "asc" | "desc";
type TabKey = "active" | "pending" | "disabled";

function sortUsers(users: SerializedUser[], field: SortField, dir: SortDir) {
  return [...users].sort((a, b) => {
    let aVal = a[field] ?? "";
    let bVal = b[field] ?? "";
    if (field === "createdAt") {
      aVal = new Date(aVal as string).getTime() as any;
      bVal = new Date(bVal as string).getTime() as any;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }
    if (aVal < bVal) return dir === "asc" ? -1 : 1;
    if (aVal > bVal) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

export function UserTableClient({ users }: { users: SerializedUser[] }) {
  const [tab, setTab] = useState<TabKey>("active");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let list = users;

    // Tab filter
    if (tab === "active") {
      list = list.filter((u) => u.isApproved && !u.isDisabled && !u.rejectedAt);
    } else if (tab === "pending") {
      list = list.filter((u) => !u.isApproved && !u.rejectedAt && !u.isDisabled && u.emailVerified);
    } else if (tab === "disabled") {
      list = list.filter((u) => u.isDisabled || u.rejectedAt);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          (u.organization?.name ?? "").toLowerCase().includes(q) ||
          (u.vendor?.companyName ?? "").toLowerCase().includes(q)
      );
    }

    return sortUsers(list, sortField, sortDir);
  }, [users, tab, search, sortField, sortDir]);

  const counts = useMemo(() => ({
    active: users.filter((u) => u.isApproved && !u.isDisabled && !u.rejectedAt).length,
    pending: users.filter((u) => !u.isApproved && !u.rejectedAt && !u.isDisabled && u.emailVerified).length,
    disabled: users.filter((u) => u.isDisabled || u.rejectedAt).length,
  }), [users]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-400" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-600" />
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ElementType; count: number }[] = [
    { key: "active", label: "Active", icon: Users, count: counts.active },
    { key: "pending", label: "Pending Approval", icon: Clock, count: counts.pending },
    { key: "disabled", label: "Disabled / Rejected", icon: Ban, count: counts.disabled },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span
              className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                tab === t.key
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, role, or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {([
                  { field: "name" as SortField, label: "Name" },
                  { field: "email" as SortField, label: "Email" },
                  { field: "role" as SortField, label: "Role" },
                ] as { field: SortField; label: string }[]).map(({ field, label }) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon field={field} />
                    </div>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Company
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden lg:table-cell"
                >
                  <div className="flex items-center gap-1">
                    Joined
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const roleInfo = ROLE_CONFIG[user.role] ?? {
                    label: user.role,
                    color: "bg-gray-100 text-gray-700",
                    icon: Users,
                  };
                  const RoleIcon = roleInfo.icon;

                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {user.name ?? <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={roleInfo.color}
                          className="flex items-center gap-1 w-fit"
                        >
                          <RoleIcon className="w-3 h-3" />
                          {roleInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {user.organization?.name ?? user.vendor?.companyName ?? (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {user.isDisabled ? (
                          <Badge variant="bg-gray-200 text-gray-600" className="flex items-center gap-1 w-fit">
                            <Ban className="w-3 h-3" /> Disabled
                          </Badge>
                        ) : user.rejectedAt ? (
                          <Badge variant="bg-red-100 text-red-700" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> Rejected
                          </Badge>
                        ) : user.isApproved ? (
                          <Badge variant="bg-emerald-100 text-emerald-700" className="flex items-center gap-1 w-fit">
                            Active
                          </Badge>
                        ) : user.emailVerified ? (
                          <Badge variant="bg-yellow-100 text-yellow-700" className="flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Pending
                          </Badge>
                        ) : (
                          <Badge variant="bg-gray-100 text-gray-500" className="flex items-center gap-1 w-fit">
                            Unverified
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                        {formatDate(new Date(user.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserActions user={user} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {users.length} total users
      </p>
    </div>
  );
}
