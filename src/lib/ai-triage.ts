import { prisma } from "@/lib/prisma";
import { isAiConfigured } from "@/lib/ai-client";
import {
  canUpdateRequestStatusForClarification,
  runClarificationCopilot,
  storeTriageArtifact,
  type ClarificationResult,
} from "@/lib/ai-assist";

export interface NormalizedTriage {
  category: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  requiresLicensedTrade: boolean;
  summary: string;
  reasoning: string;
  clarifyingQuestions: string[];
  suggestedVendorCategories: string[];
  statusSuggestion?: "READY_TO_DISPATCH" | "NEEDS_CLARIFICATION";
  confidence: number; // 0-1 float
  aiOffline?: boolean;
}

/**
 * Pre-submission AI classification data that the form already collected.
 * When present, we store it directly instead of calling AI again.
 */
export interface PreClassificationData {
  aiCategory: string;
  aiUrgency: string;
  summary: string;
  confidence: number;
  reasoning: string;
  requiresLicensedTrade: boolean;
  clarifyingQuestions?: string[];
  statusSuggestion?: "READY_TO_DISPATCH" | "NEEDS_CLARIFICATION";
  operatorOverrodeCategory: boolean;
  operatorOverrodeUrgency: boolean;
}

const URGENCY_TO_SCORE: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 4,
  emergency: 5,
};

function normalizePreClassification(
  data: PreClassificationData
): ClarificationResult {
  const urgency = data.aiUrgency.trim().toUpperCase();

  return {
    category: data.aiCategory.trim().toUpperCase() || "GENERAL",
    urgency:
      urgency === "LOW" || urgency === "HIGH" || urgency === "EMERGENCY"
        ? urgency
        : "MEDIUM",
    requiresLicensedTrade: data.requiresLicensedTrade,
    summary: data.summary,
    reasoning: data.reasoning,
    clarifyingQuestions: Array.isArray(data.clarifyingQuestions)
      ? data.clarifyingQuestions.filter((question) => typeof question === "string").slice(0, 3)
      : [],
    suggestedVendorCategories: [data.aiCategory.trim().toUpperCase() || "GENERAL"],
    statusSuggestion: data.statusSuggestion ?? "READY_TO_DISPATCH",
    confidence: data.confidence,
  };
}

/**
 * Store pre-submission classification data that was collected via
 * /api/triage/classify. Skips calling the AI again.
 */
export async function storePreClassification(
  serviceRequestId: string,
  data: PreClassificationData
): Promise<ClarificationResult> {
  const urgencyScore =
    URGENCY_TO_SCORE[data.aiUrgency.trim().toLowerCase()] ?? 3;
  const normalized = normalizePreClassification(data);

  await prisma.$transaction([
    prisma.aiClassification.create({
      data: {
        requestId: serviceRequestId,
        suggestedCategory: normalized.category,
        confidence: normalized.confidence,
        reasoning: normalized.reasoning,
      },
    }),
    prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: {
        aiTriageSummary: normalized.summary,
        aiUrgencyScore: urgencyScore,
      },
    }),
  ]);

  await storeTriageArtifact(serviceRequestId, normalized);

  return normalized;
}

/**
 * AI-powered triage for incoming service requests.
 *
 * This is the fallback path used when pre-submission classification
 * was not available at submit time.
 */
export async function triageServiceRequest(
  serviceRequestId: string
): Promise<NormalizedTriage | null> {
  if (!isAiConfigured()) return null;

  const [request, vendorCategories] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: {
        description: true,
        status: true,
        property: { select: { name: true, address: true } },
      },
    }),
    prisma.vendorSkill
      .findMany({ select: { category: true }, distinct: ["category"] })
      .then((rows) => rows.map((row) => row.category)),
  ]);

  if (!request) return null;

  const normalized = await runClarificationCopilot({
    description: request.description,
    property: request.property,
    categories: vendorCategories,
  });

  const urgencyScore =
    URGENCY_TO_SCORE[normalized.urgency.trim().toLowerCase()] ?? 3;

  try {
    await prisma.$transaction([
      prisma.aiClassification.create({
        data: {
          requestId: serviceRequestId,
          suggestedCategory: normalized.category,
          confidence: normalized.confidence,
          reasoning: normalized.reasoning,
        },
      }),
      prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          aiTriageSummary: normalized.summary,
          aiUrgencyScore: urgencyScore,
          ...(normalized.statusSuggestion === "NEEDS_CLARIFICATION" &&
          canUpdateRequestStatusForClarification(request.status)
            ? { status: "NEEDS_CLARIFICATION" }
            : {}),
        },
      }),
    ]);

    await storeTriageArtifact(serviceRequestId, normalized);
  } catch (err) {
    console.error("[ai-triage] Failed to persist results:", err);
  }

  return normalized;
}
