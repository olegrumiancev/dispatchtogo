"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import {
  Brain,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Tag,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceCategory =
  | "PLUMBING"
  | "ELECTRICAL"
  | "HVAC"
  | "APPLIANCE"
  | "LOCKSMITH"
  | "SNOW_REMOVAL"
  | "LANDSCAPING"
  | "CLEANING"
  | "DOCK_MARINA"
  | "STRUCTURAL"
  | "PEST"
  | "GENERAL"
  | "OTHER";

type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

export interface AiTriageData {
  category: ServiceCategory;
  urgency: UrgencyLevel;
  requiresLicensedTrade: boolean;
  summary: string;
  reasoning?: string;
  clarifyingQuestions: string[];
  suggestedVendorCategories: ServiceCategory[];
  statusSuggestion?: "READY_TO_DISPATCH" | "NEEDS_CLARIFICATION";
  confidence: number;
  aiOffline?: boolean;
}

interface AiTriage_BadgeProps {
  triage: AiTriageData;
  /** If true, shows a "Re-triage" button that fires the provided callback */
  onRetriage?: () => Promise<void | boolean>;
  defaultExpanded?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryLabel(value: string): string {
  return SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function confidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.75) return { label: "High confidence", color: "bg-emerald-100 text-emerald-800" };
  if (confidence >= 0.45) return { label: "Medium confidence", color: "bg-yellow-100 text-yellow-800" };
  return { label: "Low confidence", color: "bg-red-100 text-red-800" };
}

function urgencyBadgeColor(urgency: UrgencyLevel): string {
  const map: Record<UrgencyLevel, string> = {
    LOW: "bg-gray-100 text-gray-700",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-orange-100 text-orange-800",
    EMERGENCY: "bg-red-100 text-red-800",
  };
  return map[urgency] ?? "bg-gray-100 text-gray-700";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiTriageBadge({
  triage,
  onRetriage,
  defaultExpanded,
}: AiTriage_BadgeProps) {
  const hasClarifyingQuestions = triage.clarifyingQuestions?.length > 0;
  const shouldAutoExpand = hasClarifyingQuestions;
  const [expanded, setExpanded] = useState(defaultExpanded ?? shouldAutoExpand);
  const [retriaging, setRetriaging] = useState(false);

  const { label: confLabel, color: confColor } = confidenceLabel(triage.confidence);

  async function handleRetriage() {
    if (!onRetriage) return;
    setRetriaging(true);
    try {
      await onRetriage();
    } finally {
      setRetriaging(false);
    }
  }

  useEffect(() => {
    if (defaultExpanded || shouldAutoExpand) {
      setExpanded(true);
    }
  }, [defaultExpanded, shouldAutoExpand, triage.clarifyingQuestions.length]);

  if (triage.aiOffline) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50 border border-gray-200">
        <Brain className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500">AI triage is currently offline. Results will appear once connection is available.</p>
        {onRetriage && (
          <button
            onClick={handleRetriage}
            disabled={retriaging}
            className="ml-auto text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 flex-shrink-0"
          >
            {retriaging ? "Retrying…" : "Retry"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-purple-200 bg-purple-50 overflow-hidden">
      {/* Summary row */}
      <div className="px-4 py-3 flex items-start gap-3">
        <Brain className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            {/* Category */}
            <Badge className="bg-purple-100 text-purple-800 gap-1">
              <Tag className="w-3 h-3" />
              {getCategoryLabel(triage.category)}
            </Badge>

            {/* AI-suggested urgency */}
            <Badge variant={urgencyBadgeColor(triage.urgency)}>
              AI: {triage.urgency}
            </Badge>

            {/* Confidence */}
            <Badge variant={confColor}>
              {confLabel} ({Math.round(triage.confidence * 100)}%)
            </Badge>

            {triage.statusSuggestion === "NEEDS_CLARIFICATION" && (
              <Badge className="bg-amber-100 text-amber-800">
                Needs clarification
              </Badge>
            )}

            {/* Licensed trade warning */}
            {triage.requiresLicensedTrade && (
              <Badge className="bg-amber-100 text-amber-800 gap-1">
                <AlertTriangle className="w-3 h-3" />
                Licensed trade required
              </Badge>
            )}
          </div>

          {/* Summary text */}
          <p className="text-sm text-purple-900">{triage.summary}</p>

          {/* Reasoning — always visible */}
          {triage.reasoning && (
            <p className="text-sm text-purple-700 italic">{triage.reasoning}</p>
          )}
        </div>

        {/* Re-triage / chevron controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetriage && (
            <button
              onClick={handleRetriage}
              disabled={retriaging}
              className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
              title="Run AI triage again"
            >
              {retriaging ? "Running…" : "Re-triage"}
            </button>
          )}
          {hasClarifyingQuestions && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800"
              aria-label={expanded ? "Hide clarifying questions" : "Show clarifying questions"}
            >
              <span>{expanded ? "Hide questions" : "Show questions"}</span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable section — clarifying questions only */}
      {expanded && hasClarifyingQuestions && (
        <div className="border-t border-purple-200 px-4 py-3 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Clarifying questions
          </p>
          {triage.statusSuggestion === "NEEDS_CLARIFICATION" && (
            <p className="mb-2 text-sm text-amber-800">
              Answer these before dispatch, then run re-triage.
            </p>
          )}
          <ul className="space-y-1">
            {triage.clarifyingQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
