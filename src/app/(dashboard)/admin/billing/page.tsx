"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLATFORM_BILL_STATUSES } from "@/lib/constants";
import { DollarSign, RefreshCw, Send, Ban, ExternalLink } from "lucide-react";

interface BillRow {
  orgId: string;
  orgName: string;
  plan: string;
  planLabel: string;
  contactEmail: string | null;
  stripeCustomerId: string | null;
  bill: {
    id: string;
    completedRequests: number;
    includedRequests: number;
    billableRequests: number;
    amountCad: number;
    status: string;
    stripeInvoiceUrl: string | null;
    sentAt: string | null;
    paidAt: string | null;
  } | null;
  liveUsage: {
    completedRequests: number;
    includedRequests: number;
    billableRequests: number;
    amountCad: number;
  } | null;
}

interface BillingData {
  periodStart: string;
  periodEnd: string;
  rows: BillRow[];
}

function getBillStatusColor(status: string) {
  return (
    PLATFORM_BILL_STATUSES.find((s) => s.value === status)?.color ??
    "bg-gray-100 text-gray-800"
  );
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function getPrevMonth(): string {
  const now = new Date();
  const y = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const m = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
  return `${y}-${String(m).padStart(2, "0")}`;
}

export default function AdminBillingPage() {
  const [month, setMonth] = useState(getPrevMonth());
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing?month=${month}`);
      if (!res.ok) throw new Error("Failed to load billing data");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", month }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generate failed");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleBillAction = async (billId: string, action: "send" | "void") => {
    setActionLoading(billId + action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/${billId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `${action} failed`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const totalBillable = data?.rows.reduce((sum, r) => {
    const amount = r.bill?.amountCad ?? r.liveUsage?.amountCad ?? 0;
    return sum + amount;
  }, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Billing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monthly usage and invoice management for operator organizations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button variant="secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Period</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {formatMonth(data.periodStart)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Orgs Tracked</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.rows.filter((r) => r.bill).length}</p>
            </div>
          </Card>
          <Card>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Billable</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">${totalBillable.toFixed(2)}</p>
            </div>
          </Card>
          <Card>
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Actions</p>
                <p className="text-xs text-gray-600 mt-1">Generate draft bills</p>
              </div>
              <Button
                variant="primary"
                onClick={handleGenerate}
                loading={generating}
                className="ml-2"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Generate Bills
              </Button>
            </div>
          </Card>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : data?.rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">No organizations found.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Included</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Billable</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (CAD)</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.rows.map((row) => {
                  const usage = row.bill ?? row.liveUsage;
                  const completedRequests = usage?.completedRequests ?? 0;
                  const includedRequests = usage?.includedRequests ?? 0;
                  const billableRequests = usage?.billableRequests ?? 0;
                  const amountCad = usage?.amountCad ?? 0;

                  return (
                    <tr key={row.orgId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{row.orgName}</p>
                        {row.contactEmail && (
                          <p className="text-xs text-gray-400 mt-0.5">{row.contactEmail}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={row.plan === "VALUE" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"}>
                          {row.planLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-semibold text-gray-900">{completedRequests}</td>
                      <td className="px-4 py-4 text-center text-sm text-gray-500">{includedRequests}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm font-semibold ${billableRequests > 0 ? "text-amber-600" : "text-gray-400"}`}>
                          {billableRequests}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-bold ${amountCad > 0 ? "text-blue-700" : "text-gray-400"}`}>
                          ${amountCad.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {row.bill ? (
                          <Badge className={getBillStatusColor(row.bill.status)}>
                            {row.bill.status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">No bill</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {row.bill?.stripeInvoiceUrl && (
                            <a
                              href={row.bill.stripeInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="View Stripe invoice"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {row.bill?.status === "DRAFT" && (
                            <>
                              <Button
                                variant="primary"
                                onClick={() => handleBillAction(row.bill!.id, "send")}
                                loading={actionLoading === row.bill!.id + "send"}
                                disabled={!!actionLoading}
                                className="text-xs px-2 py-1 h-auto"
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Send
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => handleBillAction(row.bill!.id, "void")}
                                loading={actionLoading === row.bill!.id + "void"}
                                disabled={!!actionLoading}
                                className="text-xs px-2 py-1 h-auto"
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                Void
                              </Button>
                            </>
                          )}
                        </div>
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
