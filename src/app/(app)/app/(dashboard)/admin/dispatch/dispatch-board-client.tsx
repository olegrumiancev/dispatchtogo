"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { cn, formatDate } from "@/lib/utils";
import { URGENCY_LEVELS, REQUEST_STATUSES } from "@/lib/constants";
import {
  getAdminOperatorRequestStatusColor,
  getAdminOperatorRequestStatusLabel,
} from "@/lib/admin-operator-request-status";
import type { AdminDispatchBoardData } from "@/lib/admin-dispatch-board";
import { AlertTriangle, ChevronDown, ChevronUp, ChevronsUpDown, Eye } from "lucide-react";
import AssignModal from "./assign-modal";
import { useCatalogOptions } from "@/hooks/use-catalog-options";

function getUrgencyColor(urgency: string) {
  return URGENCY_LEVELS.find((item) => item.value === urgency)?.color ?? "bg-gray-100 text-gray-800";
}

function formatSyncTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPauseReturnDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function AdminDispatchBoardClient({ initialData }: { initialData: AdminDispatchBoardData }) {
  const { serviceCategories } = useCatalogOptions();
  const [board, setBoard] = useState(initialData);
  const [refreshStatus, setRefreshStatus] = useState<"active" | "paused">("active");
  const initialRequestIdsRef = useRef(new Set(initialData.requests.map((request) => request.id)));
  const seenRequestIdsRef = useRef(new Set(initialData.requests.map((request) => request.id)));
  const [freshRequestIds, setFreshRequestIds] = useState<Set<string>>(new Set());
  const getCategoryLabel = (category: string) =>
    serviceCategories.find((item) => item.value === category)?.label ?? category;

  useEffect(() => {
    setBoard(initialData);
    setRefreshStatus("active");
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delayMs: number) => {
      timeoutId = setTimeout(runPoll, delayMs);
    };

    const querySuffix = board.queryString ? `?${board.queryString}` : "";

    const runPoll = async () => {
      if (cancelled) return;

      const nextDelay = document.visibilityState === "visible" ? 15000 : 60000;
      if (!navigator.onLine) {
        setRefreshStatus("paused");
        schedule(nextDelay);
        return;
      }

      try {
        const versionRes = await fetch(`/api/admin/dispatch/version${querySuffix}`, {
          cache: "no-store",
        });
        if (!versionRes.ok) throw new Error("Version check failed");

        const versionPayload = (await versionRes.json()) as { version: string; lastCheckedAt: string };

        if (cancelled) return;

        if (versionPayload.version !== board.version) {
          const boardRes = await fetch(`/api/admin/dispatch/board${querySuffix}`, {
            cache: "no-store",
          });
          if (!boardRes.ok) throw new Error("Board refresh failed");

          const nextBoard = (await boardRes.json()) as AdminDispatchBoardData;
          if (cancelled) return;

          const nextFreshIds = new Set(freshRequestIds);
          for (const request of nextBoard.requests) {
            if (!seenRequestIdsRef.current.has(request.id) && !initialRequestIdsRef.current.has(request.id)) {
              nextFreshIds.add(request.id);
            }
            seenRequestIdsRef.current.add(request.id);
          }

          setFreshRequestIds(nextFreshIds);
          setBoard(nextBoard);
        } else {
          setBoard((current) => ({
            ...current,
            lastCheckedAt: versionPayload.lastCheckedAt,
          }));
        }

        setRefreshStatus("active");
      } catch {
        if (!cancelled) {
          setRefreshStatus("paused");
        }
      } finally {
        if (!cancelled) {
          schedule(nextDelay);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (timeoutId) clearTimeout(timeoutId);
      schedule(document.visibilityState === "visible" ? 5000 : 60000);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule(15000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [board.queryString, board.version, freshRequestIds]);

  const buildUrl = useMemo(() => {
    return (params: Record<string, string>) => {
      const merged = { ...board.extraParams, ...params };
      Object.keys(merged).forEach((key) => {
        if (!merged[key]) delete merged[key];
      });
      const qs = new URLSearchParams(merged).toString();
      return `/app/admin/dispatch${qs ? `?${qs}` : ""}`;
    };
  }, [board.extraParams]);

  const sortUrl = (col: string) => {
    const newDir = board.filters.sortBy === col && board.filters.sortDir === "asc" ? "desc" : "asc";
    return buildUrl({ sortBy: col, sortDir: newDir, page: "1" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
          <p className="mt-1 text-sm text-gray-500">
            {board.total} request{board.total !== 1 ? "s" : ""}
            {!board.filters.statusFilter && " · active only"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              refreshStatus === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
            )}
          />
          <span>{refreshStatus === "active" ? "Auto-refreshing" : "Refresh paused"}</span>
          <span className="text-xs text-gray-400">Checked {formatSyncTime(board.lastCheckedAt)}</span>
        </div>
      </div>

      {board.disputedRequests.length > 0 && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
            <span className="text-sm font-semibold text-rose-700">
              {board.disputedRequests.length} disputed request{board.disputedRequests.length !== 1 ? "s" : ""} - admin action required
            </span>
          </div>
          <div className="ml-6 flex flex-wrap gap-2">
            {board.disputedRequests.map((request) => (
              <Link
                key={request.id}
                href={`/app/admin/dispatch/${request.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs text-rose-700 transition-colors hover:bg-rose-100"
              >
                <span className="font-medium">{request.referenceNumber}</span>
                <span className="text-rose-400">·</span>
                {request.property.name}
                {request.job?.vendor && <span className="text-rose-400">· {request.job.vendor.companyName}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Card>
        <form method="GET" action="/app/admin/dispatch" className="flex flex-col flex-wrap gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <select
            name="status"
            defaultValue={board.filters.statusFilter}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Active (non-terminal)</option>
            {REQUEST_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {getAdminOperatorRequestStatusLabel(status.value)}
              </option>
            ))}
          </select>
          <select
            name="urgency"
            defaultValue={board.filters.urgencyFilter}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Urgencies</option>
            {URGENCY_LEVELS.map((urgency) => (
              <option key={urgency.value} value={urgency.value}>
                {urgency.label}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={board.filters.categoryFilter}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {serviceCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <select
            name="org"
            defaultValue={board.filters.orgFilter}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Organizations</option>
            {board.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
          {board.filters.sortBy !== "createdAt" && <input type="hidden" name="sortBy" value={board.filters.sortBy} />}
          {board.filters.sortDir !== "desc" && <input type="hidden" name="sortDir" value={board.filters.sortDir} />}
          <input
            type="search"
            name="search"
            defaultValue={board.filters.searchFilter}
            placeholder="Search ref, property, description..."
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-w-[200px]"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" size="sm" className="flex-1 justify-center sm:flex-none">
              Filter
            </Button>
            {(board.filters.statusFilter ||
              board.filters.urgencyFilter ||
              board.filters.categoryFilter ||
              board.filters.orgFilter ||
              board.filters.searchFilter) && (
              <Link href="/app/admin/dispatch" className="flex-1 sm:flex-none">
                <Button type="button" variant="ghost" size="sm" className="w-full justify-center">
                  Clear
                </Button>
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          {board.requests.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No requests found.{" "}
              {(board.filters.statusFilter ||
                board.filters.urgencyFilter ||
                board.filters.categoryFilter ||
                board.filters.orgFilter ||
                board.filters.searchFilter) && (
                <Link href="/app/admin/dispatch" className="text-blue-600 hover:underline">
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {([
                    { col: "referenceNumber", label: "Ref #", cls: "" },
                    { col: "org", label: "Org", cls: "hidden lg:table-cell" },
                    { col: "property", label: "Property", cls: "" },
                    { col: "category", label: "Category", cls: "hidden md:table-cell" },
                    { col: "urgency", label: "Urgency", cls: "hidden sm:table-cell" },
                    { col: "status", label: "Status", cls: "" },
                  ] as const).map(({ col, label, cls }) => {
                    const active = board.filters.sortBy === col;
                    const Icon = active
                      ? board.filters.sortDir === "asc"
                        ? ChevronUp
                        : ChevronDown
                      : ChevronsUpDown;
                    return (
                      <th key={col} className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${cls}`}>
                        <Link
                          href={sortUrl(col)}
                          className={`inline-flex items-center gap-1 transition-colors hover:text-gray-800 ${active ? "text-gray-800" : ""}`}
                        >
                          {label}
                          <Icon className={`h-3 w-3 ${active ? "text-blue-500" : "text-gray-400"}`} />
                        </Link>
                      </th>
                    );
                  })}
                  <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                    <Link
                      href={sortUrl("createdAt")}
                      className={`inline-flex items-center gap-1 transition-colors hover:text-gray-800 ${
                        board.filters.sortBy === "createdAt" ? "text-gray-800" : ""
                      }`}
                    >
                      Created
                      {board.filters.sortBy === "createdAt" ? (
                        board.filters.sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-blue-500" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-blue-500" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </Link>
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {board.requests.map((request) => {
                  const isUnassigned = !request.job || request.job.status === "DECLINED";
                  const isFresh = freshRequestIds.has(request.id);
                  const isPaused = !!request.job?.isPaused;
                  return (
                    <tr
                      key={request.id}
                      className={cn(
                        "transition-colors",
                        request.status === "DISPUTED"
                          ? "bg-rose-50 hover:bg-rose-100"
                          : isPaused
                          ? "bg-amber-50 hover:bg-amber-100"
                          : isFresh
                          ? "bg-sky-50 hover:bg-sky-100"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/app/admin/dispatch/${request.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            {request.referenceNumber}
                          </Link>
                          {isFresh && (
                            <Badge variant="bg-sky-100 text-sky-800">
                              New
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="hidden max-w-[140px] truncate px-6 py-4 text-sm text-gray-600 lg:table-cell">
                        {request.organization.name}
                      </td>
                      <td className="max-w-[160px] truncate px-6 py-4 text-sm text-gray-700">{request.property.name}</td>
                      <td className="hidden px-6 py-4 text-sm text-gray-500 md:table-cell">{getCategoryLabel(request.category)}</td>
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <Badge variant={getUrgencyColor(request.urgency)}>{request.urgency}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge variant={getAdminOperatorRequestStatusColor(request.status)}>
                            {getAdminOperatorRequestStatusLabel(request.status)}
                          </Badge>
                          {isPaused && (
                            <>
                              <Badge variant="bg-amber-100 text-amber-800">Paused - Will Return</Badge>
                              {(request.job?.estimatedReturnDate || request.job?.pauseReason) && (
                                <div className="max-w-[14rem] space-y-0.5 text-xs text-amber-700">
                                  {request.job?.estimatedReturnDate && (
                                    <p>Expected return: {formatPauseReturnDate(request.job.estimatedReturnDate)}</p>
                                  )}
                                  {request.job?.pauseReason && (
                                    <p className="truncate" title={request.job.pauseReason}>
                                      {request.job.pauseReason}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-gray-500 md:table-cell">{formatDate(request.createdAt)}</td>
                      <td className="hidden px-6 py-4 text-sm md:table-cell">
                        {request.job && request.job.status !== "DECLINED" ? (
                          <div>
                            <span className="text-gray-700">{request.job.vendor.companyName}</span>
                            <a href={`tel:${request.job.vendor.phone}`} className="block text-xs text-blue-500 hover:text-blue-700">
                              {request.job.vendor.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isUnassigned && (
                            <AssignModal
                              requestRef={request.referenceNumber}
                              requestId={request.id}
                              vendors={board.vendorsForModal}
                            />
                          )}
                          <Link href={`/app/admin/dispatch/${request.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {board.totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <PaginationControls
              page={board.page}
              totalPages={board.totalPages}
              basePath="/app/admin/dispatch"
              extraParams={board.extraParams}
              total={board.total}
              pageSize={25}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
