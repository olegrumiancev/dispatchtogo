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

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 inline ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 inline ml-1 text-blue-600" />
    : <ChevronDown className="w-3.5 h-3.5 inline ml-1 text-blue-600" />;
}

export function UserTableClient({ users }: { users: SerializedUser[] }) {
  const [tab, setTab] = useState<TabKey>("active");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const getStatus = (u: SerializedUser) => {
    const isPending = u.role !== "ADMIN" && u.emailVerified && !u.isApproved && !u.rejectedAt;
    const isRejected = u.rejectedAt !== null;
    const isUnverified = u.role !== "ADMIN" && !u.emailVerified;
    return { isPending, isRejected, isUnverified };
  };

  const activeUsers = useMemo(() => users.filter((u) => (u.isApproved || u.role === "ADMIN") && !u.isDisabled), [users]);
  const pendingUsers = useMemo(() => users.filter((u) => !u.isApproved && u.role !== "ADMIN" && !u.isDisabled), [users]);
  const disabledUsers = useMemo(() => users.filter((u) => u.isDisabled), [users]);
  const tabUsers = tab === "active" ? activeUsers : tab === "pending" ? pendingUsers : disabledUsers;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabUsers;
    return tabUsers.filter((u) => {
      const org = u.organization?.name ?? u.vendor?.companyName ?? "";
      return (
        (u.name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        org.toLowerCase().includes(q)
      );
    });
  }, [tabUsers, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string;
      let bVal: string;
      if (sortField === "name") { aVal = (a.name ?? "").toLowerCase(); bVal = (b.name ?? "").toLowerCase(); }
      else if (sortField === "email") { aVal = a.email.toLowerCase(); bVal = b.email.toLowerCase(); }
      else if (sortField === "role") { aVal = a.role; bVal = b.role; }
      else { aVal = a.createdAt; bVal = b.createdAt; }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginatedRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const thClass = "text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none cursor-pointer hover:text-gray-800 transition-colors";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1 w-fit">
          {(["active", "pending", "disabled"] as TabKey[]).map((t) => {
            const count = t === "active" ? activeUsers.length : t === "pending" ? pendingUsers.length : disabledUsers.length;
            const label = t === "active" ? "Active" : t === "pending" ? "Pending / To Verify" : "Disabled";
            return (
              <button key={t} onClick={() => { setTab(t); setSearch(""); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {label}
                <span className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${tab === t ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search name, email, org…" className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto">
          {sorted.length === 0 ? (
            <div className="px-6 py-16 text-center"><Users className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-400">{search ? "No users match your search." : "No users in this category."}</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className={thClass} onClick={() => toggleSort("name")}>Name <SortIcon field="name" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => toggleSort("email")}>Email <SortIcon field="email" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => toggleSort("role")}>Role <SortIcon field="role" sortField={sortField} sortDir={sortDir} /></th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Organization / Company</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className={`${thClass} hidden lg:table-cell`} onClick={() => toggleSort("createdAt")}>Created <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} /></th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRows.map((u) => {
                  const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.OPERATOR;
                  const { isPending, isRejected, isUnverified } = getStatus(u);
                  const isUserDisabled = u.isDisabled;
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isPending ? "bg-amber-50 hover:bg-amber-100" : ""} ${isRejected ? "bg-red-50/50 hover:bg-red-50" : ""} ${isUserDisabled ? "opacity-60" : ""}`}>
                      <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{u.name || <span className="text-gray-400 italic">No name</span>}</p></td>
                      <td className="px-6 py-4"><p className="text-sm text-gray-600">{u.email}</p></td>
                      <td className="px-6 py-4"><Badge variant={cfg.color}>{cfg.label}</Badge></td>
                      <td className="px-6 py-4 hidden md:table-cell"><p className="text-sm text-gray-600">{u.organization?.name ?? u.vendor?.companyName ?? <span className="text-gray-400">&mdash;</span>}</p></td>
                      <td className="px-6 py-4">
                        {u.role === "ADMIN" ? (<Badge variant="bg-emerald-100 text-emerald-700">Active</Badge>)
                        : isUserDisabled ? (<Badge variant="bg-gray-200 text-gray-600"><Ban className="w-3 h-3 mr-0.5" />Disabled</Badge>)
                        : isUnverified ? (<Badge variant="bg-gray-200 text-gray-600">Unverified</Badge>)
                        : isPending ? (<Badge variant="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-0.5" />Pending Approval</Badge>)
                        : isRejected ? (<div className="space-y-1"><Badge variant="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-0.5" />Rejected</Badge>{u.rejectionNote && (<p className="text-xs text-red-600 max-w-[200px] truncate" title={u.rejectionNote}>{u.rejectionNote}</p>)}</div>)
                        : u.isApproved ? (<Badge variant="bg-emerald-100 text-emerald-700">Active</Badge>)
                        : (<Badge variant="bg-gray-200 text-gray-600">Inactive</Badge>)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4 text-right"><UserActions userId={u.id} userName={u.name ?? ""} userEmail={u.email} isApproved={u.isApproved} isRejected={isRejected} isDisabled={isUserDisabled} isPending={!!isPending} isAdmin={u.role === "ADMIN"} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Showing <span className="font-medium text-gray-700">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)}</span> of <span className="font-medium text-gray-700">{sorted.length}</span></p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors">‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { let start = Math.max(1, currentPage - 2); let end = Math.min(totalPages, start + 4); if (end - start < 4) start = Math.max(1, end - 4); return start + i; }).map((p) => (<button key={p} onClick={() => setCurrentPage(p)} className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-sm transition-colors ${p === currentPage ? "bg-blue-600 text-white font-semibold" : "text-gray-700 hover:bg-gray-100"}`}>{p}</button>))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors">›</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
