"use client";

import { useState } from "react";
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
  clarifyingQuestions: string[];
  suggestedVendorCategories: ServiceCategory[];
  confidence: number;
  aiOffline?: boolean;
}

interface AiTriage_BadgeProps {
  triage: AiTriageData;
  /** If true, shows a "Re-triage" button that fires the provided callback */
  onRetriage?: () => Promise<void>;
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

export function AiTriageBadge({ triage, onRetriage }: AiTriage_BadgeProps) {
  const [expanded, setExpanded] = useState(false);
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

  if (triage.aiOffline) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50 border border-gray-200">
        <Brain className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500">AI triage is currently offline. Results will appear once Ollama is available.</p>
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
        </div>

        {/* Expand / Re-triage controls */}
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
          {(triage.clarifyingQuestions.length > 0 || triage.suggestedVendorCategories.length > 0) && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-purple-500 hover:text-purple-700"
              aria-label={expanded ? "Collapse AI details" : "Expand AI details"}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable section */}
      {expanded && (
        <div className="border-t border-purple-200 px-4 py-3 space-y-3 bg-white">
          {/* Suggested vendor categories */}
          {triage.suggestedVendorCategories.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Suggested vendor categories
              </p>
              <div className="flex flex-wrap gap-1.5">
                {triage.suggestedVendorCategories.map((cat) => (
                  <Badge key={cat} className="bg-blue-50 text-blue-700">
                    {getCategoryLabel(cat)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Clarifying questions */}
          {triage.clarifyingQuestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Clarifying questions
              </p>
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
      )}
    </div>
  );
}
