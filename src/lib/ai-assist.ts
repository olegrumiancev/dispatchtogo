import { SERVICE_CATEGORIES } from "@/lib/constants";
import type { NormalizedTriage } from "@/lib/ai-triage";
import {
  AI_ARTIFACT_ACTIONS,
  getLatestAiArtifact,
  saveAiArtifact,
  type StoredAiArtifact,
} from "@/lib/ai-artifacts";
import { chatCompletion, isAiConfigured } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/s3-client";

type ClarificationStatus = "READY_TO_DISPATCH" | "NEEDS_CLARIFICATION";

export interface ClarificationResult extends NormalizedTriage {
  statusSuggestion: ClarificationStatus;
}

export interface DispatchAssist {
  brief: string;
  siteRisks: string[];
  calloutPoints: string[];
  questionsToConfirm: string[];
}

export interface CompletionAssist {
  summary: string;
  proofSummary: string;
  missingEvidenceFlags: string[];
  confidence: number;
}

export interface CredentialAssist {
  extractedType: string | null;
  extractedNumber: string | null;
  expiresAt: string | null;
  holderName: string | null;
  flags: string[];
  confidence: number;
}

export interface OpsInsightSummary {
  headline: string;
  bullets: string[];
  anomalies: string[];
  recommendedActions: string[];
}

const DEFAULT_CATEGORIES: string[] = SERVICE_CATEGORIES.map(
  (category) => category.value
);
const PRE_DISPATCH_STATUSES = new Set([
  "SUBMITTED",
  "TRIAGING",
  "NEEDS_CLARIFICATION",
  "READY_TO_DISPATCH",
]);

type JsonObject = Record<string, unknown>;

function parseJsonObject(raw: string | null): JsonObject | null {
  if (!raw) return null;

  try {
    return JSON.parse(
      raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    ) as JsonObject;
  } catch {
    return null;
  }
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown, limit = 4): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeConfidence(value: unknown, fallback = 0.5): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  if (value > 1) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

function normalizeUrgency(
  value: unknown
): ClarificationResult["urgency"] {
  const normalized = normalizeString(value, "MEDIUM").toUpperCase();
  if (normalized === "LOW") return "LOW";
  if (normalized === "HIGH") return "HIGH";
  if (normalized === "EMERGENCY") return "EMERGENCY";
  return "MEDIUM";
}

function normalizeCategory(value: unknown): string {
  const normalized = normalizeString(value, "GENERAL").toUpperCase();
  return DEFAULT_CATEGORIES.includes(normalized) ? normalized : "GENERAL";
}

function shouldHoldForClarification(input: {
  statusSuggestion: unknown;
  questions: string[];
  confidence: number;
  requiresLicensedTrade: boolean;
}): boolean {
  const explicitHold =
    normalizeString(input.statusSuggestion, "READY_TO_DISPATCH").toUpperCase() ===
    "NEEDS_CLARIFICATION";

  if (!explicitHold || input.questions.length === 0) return false;

  return (
    input.confidence < 0.8 ||
    input.requiresLicensedTrade ||
    input.questions.length >= 2
  );
}

function firstSentence(value: string, fallback: string): string {
  const normalized = value.trim();
  if (!normalized) return fallback;

  const sentence = normalized.split(/(?<=[.!?])\s+/)[0]?.trim();
  return sentence || fallback;
}

function guessUrgencyFromDescription(description: string): ClarificationResult["urgency"] {
  const lower = description.toLowerCase();
  if (/(gas|fire|sparking|electroc|flood|burst pipe|smoke|no heat)/.test(lower)) {
    return "EMERGENCY";
  }
  if (/(leak|water|power out|locked out|toilet overflow|no hot water)/.test(lower)) {
    return "HIGH";
  }
  if (/(broken|not working|issue|problem|repair)/.test(lower)) {
    return "MEDIUM";
  }
  return "LOW";
}

function guessCategoryFromDescription(description: string): string {
  const lower = description.toLowerCase();
  if (/(pipe|leak|toilet|sink|drain|faucet|water heater)/.test(lower)) return "PLUMBING";
  if (/(breaker|outlet|power|light|electrical|wiring)/.test(lower)) return "ELECTRICAL";
  if (/(furnace|ac|air conditioning|hvac|thermostat|heat)/.test(lower)) return "HVAC";
  if (/(lock|door|key|deadbolt)/.test(lower)) return "LOCKSMITH";
  if (/(snow|ice|plow)/.test(lower)) return "SNOW_REMOVAL";
  if (/(grass|lawn|tree|landscap)/.test(lower)) return "LANDSCAPING";
  if (/(dock|slip|marina|boat)/.test(lower)) return "DOCK_MARINA";
  if (/(clean|housekeep|trash)/.test(lower)) return "CLEANING";
  if (/(pest|rodent|mouse|wasp|bug|insect)/.test(lower)) return "PEST";
  return "GENERAL";
}

function heuristicClarificationResult(
  description: string,
  property?: { name?: string | null; address?: string | null } | null
): ClarificationResult {
  const questions: string[] = [];
  const lower = description.toLowerCase();

  if (!/(room|unit|cabin|site|building|dock|pool|lobby|kitchen|bathroom|washroom)/.test(lower)) {
    questions.push("What is the exact location on site?");
  }
  if (!/(urgent|emergency|active|currently|still|right now|out|overflow|leaking)/.test(lower)) {
    questions.push("Is the issue active right now, and how severe is it?");
  }
  if (!/(photo|pictured|attached|image)/.test(lower)) {
    questions.push("Do you have a photo that shows the issue clearly?");
  }

  const category = guessCategoryFromDescription(description);
  const urgency = guessUrgencyFromDescription(description);
  const requiresLicensedTrade = ["PLUMBING", "ELECTRICAL", "HVAC"].includes(category);
  const summary = firstSentence(
    description,
    `Issue reported at ${property?.name ?? "property"}`
  ).slice(0, 120);
  const confidence = questions.length === 0 ? 0.6 : 0.35;

  return {
    category,
    urgency,
    requiresLicensedTrade,
    summary,
    reasoning:
      "Generated from rule-based fallback because AI was unavailable or returned invalid data.",
    clarifyingQuestions: questions,
    suggestedVendorCategories: [category],
    confidence,
    aiOffline: !isAiConfigured(),
    statusSuggestion:
      questions.length > 0 && requiresLicensedTrade
        ? "NEEDS_CLARIFICATION"
        : "READY_TO_DISPATCH",
  };
}

export async function runClarificationCopilot(input: {
  description: string;
  property?: { name?: string | null; address?: string | null } | null;
  categories?: string[];
}): Promise<ClarificationResult> {
  const categories = input.categories?.length
    ? input.categories
    : DEFAULT_CATEGORIES;

  if (!isAiConfigured()) {
    return heuristicClarificationResult(input.description, input.property);
  }

  const systemPrompt = `You are a maintenance request clarification copilot for a field service dispatch platform.

Your job is to classify the request and decide whether the operator has enough information to dispatch work.

Rules:
- Keep questions concrete and operational.
- Ask at most 3 clarifying questions.
- Only suggest NEEDS_CLARIFICATION when missing information would materially increase dispatch risk.
- Never mention vendors, ranking, pricing, or fairness.
- Use only these categories: ${categories.join(", ")}
- Urgency must be one of: LOW, MEDIUM, HIGH, EMERGENCY

Respond ONLY with valid JSON:
{"category":"...","urgency":"...","summary":"...","confidence":85,"reasoning":"...","requiresLicensedTrade":false,"statusSuggestion":"READY_TO_DISPATCH","questions":["..."],"suggestedVendorCategories":["..."]}`;

  const propertyContext = input.property?.name
    ? `Property: ${input.property.name} (${input.property.address ?? "N/A"})\n`
    : "";

  const raw = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `${propertyContext}Description: ${input.description.trim()}`,
      },
    ],
    { temperature: 0.1, maxTokens: 700 }
  );

  const parsed = parseJsonObject(raw);
  if (!parsed) {
    return heuristicClarificationResult(input.description, input.property);
  }

  const confidence = normalizeConfidence(parsed.confidence, 0.5);
  const questions = normalizeStringArray(parsed.questions, 3);
  const requiresLicensedTrade = Boolean(parsed.requiresLicensedTrade);
  const hold = shouldHoldForClarification({
    statusSuggestion: parsed.statusSuggestion,
    questions,
    confidence,
    requiresLicensedTrade,
  });

  const category = normalizeCategory(parsed.category);

  return {
    category,
    urgency: normalizeUrgency(parsed.urgency),
    requiresLicensedTrade,
    summary: normalizeString(parsed.summary, firstSentence(input.description, "Maintenance issue reported")).slice(0, 120),
    reasoning: normalizeString(parsed.reasoning, "AI classified the request."),
    clarifyingQuestions: questions,
    suggestedVendorCategories:
      normalizeStringArray(parsed.suggestedVendorCategories, 3).map(normalizeCategory),
    confidence,
    statusSuggestion: hold ? "NEEDS_CLARIFICATION" : "READY_TO_DISPATCH",
  };
}

export async function storeTriageArtifact(
  serviceRequestId: string,
  triage: ClarificationResult
) {
  await saveAiArtifact({
    entityType: "SERVICE_REQUEST",
    entityId: serviceRequestId,
    action: AI_ARTIFACT_ACTIONS.TRIAGE,
    data: triage,
    source: triage.aiOffline ? "heuristic" : "ai",
  });
}

export async function getStoredTriageArtifact(
  serviceRequestId: string
): Promise<StoredAiArtifact<ClarificationResult> | null> {
  return getLatestAiArtifact<ClarificationResult>(
    "SERVICE_REQUEST",
    serviceRequestId,
    AI_ARTIFACT_ACTIONS.TRIAGE
  );
}

function heuristicDispatchAssist(input: {
  referenceNumber: string;
  description: string;
  category: string;
  urgency: string;
  propertyName: string;
  vendorName: string;
  photoCount: number;
}): DispatchAssist {
  const siteRisks = [
    input.urgency === "EMERGENCY" ? "Escalated urgency: confirm response time immediately." : "",
    input.photoCount === 0 ? "No intake photos were attached." : "",
  ].filter(Boolean);

  return {
    brief: `${input.referenceNumber}: ${input.category} issue at ${input.propertyName}. ${firstSentence(
      input.description,
      "Review request details with the vendor."
    )}`,
    siteRisks,
    calloutPoints: [
      `Urgency: ${input.urgency}`,
      `Chosen vendor: ${input.vendorName}`,
      input.photoCount > 0
        ? `${input.photoCount} intake photo(s) available for review.`
        : "No intake photos attached.",
    ],
    questionsToConfirm: [
      "Can you confirm arrival timing and site access details?",
      "Do you need any additional photos or exact location details before rolling?",
    ],
  };
}

export async function generateDispatchAssist(
  serviceRequestId: string,
  vendorId: string
): Promise<StoredAiArtifact<DispatchAssist>> {
  const entityId = `${serviceRequestId}:${vendorId}`;
  const cached = await getLatestAiArtifact<DispatchAssist>(
    "SERVICE_REQUEST",
    entityId,
    AI_ARTIFACT_ACTIONS.DISPATCH_HANDOFF
  );
  if (cached) return cached;

  const request = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: {
      property: { select: { name: true, address: true } },
      organization: { select: { name: true } },
      photos: { select: { id: true } },
    },
  });
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { companyName: true, contactName: true, phone: true },
  });

  if (!request || !vendor) {
    throw new Error("Request or vendor not found for dispatch assist");
  }

  let assist = heuristicDispatchAssist({
    referenceNumber: request.referenceNumber,
    description: request.description,
    category: request.category,
    urgency: request.urgency,
    propertyName: request.property?.name ?? "Unknown property",
    vendorName: vendor.companyName,
    photoCount: request.photos.length,
  });
  let source: "ai" | "heuristic" = "heuristic";

  if (isAiConfigured()) {
    const systemPrompt = `You are a dispatch handoff copilot.

The vendor has already been chosen by a human.
Do not rank vendors, compare vendors, or imply this vendor is the best fit.
Only help the operator communicate clearly with the selected vendor.

Respond ONLY with valid JSON:
{"brief":"...","siteRisks":["..."],"calloutPoints":["..."],"questionsToConfirm":["..."]}`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Request ${request.referenceNumber}
Organization: ${request.organization?.name ?? "Unknown"}
Property: ${request.property?.name ?? "Unknown"} (${request.property?.address ?? "N/A"})
Category: ${request.category}
Urgency: ${request.urgency}
Selected vendor: ${vendor.companyName} (${vendor.contactName}, ${vendor.phone})
Intake photos attached: ${request.photos.length}
Description:
${request.description}`,
        },
      ],
      { temperature: 0.1, maxTokens: 700 }
    );

    const parsed = parseJsonObject(raw);
    if (parsed) {
      assist = {
        brief: normalizeString(parsed.brief, assist.brief),
        siteRisks: normalizeStringArray(parsed.siteRisks, 4),
        calloutPoints: normalizeStringArray(parsed.calloutPoints, 5),
        questionsToConfirm: normalizeStringArray(parsed.questionsToConfirm, 4),
      };
      source = "ai";
    }
  }

  await saveAiArtifact({
    entityType: "SERVICE_REQUEST",
    entityId,
    action: AI_ARTIFACT_ACTIONS.DISPATCH_HANDOFF,
    data: assist,
    source,
  });

  return {
    data: assist,
    createdAt: new Date().toISOString(),
    source,
  };
}

function heuristicCompletionAssist(input: {
  description: string;
  propertyName: string;
  category: string;
  vendorNotes: string | null;
  noteCount: number;
  materialCount: number;
  beforeCount: number;
  afterCount: number;
}): CompletionAssist {
  const missingEvidenceFlags: string[] = [];

  if (input.afterCount === 0) missingEvidenceFlags.push("No after photos uploaded.");
  if (input.beforeCount === 0) missingEvidenceFlags.push("No before photos uploaded.");
  if (!input.vendorNotes?.trim() && input.noteCount === 0) {
    missingEvidenceFlags.push("Work performed is not described in vendor notes.");
  }
  if (input.materialCount === 0 && /(replace|repair|install|pipe|part|fixture)/i.test(input.description)) {
    missingEvidenceFlags.push("No materials recorded despite repair language in the request.");
  }

  const summary = input.vendorNotes?.trim()
    ? input.vendorNotes.trim()
    : `Completed ${input.category.toLowerCase()} work at ${input.propertyName}.`;

  return {
    summary,
    proofSummary: `${summary} ${missingEvidenceFlags.length ? `Open evidence gaps: ${missingEvidenceFlags.join(" ")}` : "Evidence appears complete."}`.trim(),
    missingEvidenceFlags,
    confidence: missingEvidenceFlags.length === 0 ? 0.65 : 0.45,
  };
}

export async function generateCompletionAssist(
  jobId: string
): Promise<StoredAiArtifact<CompletionAssist>> {
  const cached = await getLatestAiArtifact<CompletionAssist>(
    "JOB",
    jobId,
    AI_ARTIFACT_ACTIONS.COMPLETION_ASSIST
  );
  if (cached) return cached;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      serviceRequest: {
        include: {
          property: true,
        },
      },
      notes: {
        orderBy: { createdAt: "asc" },
      },
      materials: true,
      photos: true,
    },
  });

  if (!job) {
    throw new Error("Job not found for completion assist");
  }

  let assist = heuristicCompletionAssist({
    description: job.serviceRequest.description,
    propertyName: job.serviceRequest.property?.name ?? "property",
    category: job.serviceRequest.category,
    vendorNotes: job.vendorNotes,
    noteCount: job.notes.length,
    materialCount: job.materials.length,
    beforeCount: job.photos.filter((photo) => photo.type === "BEFORE").length,
    afterCount: job.photos.filter((photo) => photo.type === "AFTER").length,
  });
  let source: "ai" | "heuristic" = "heuristic";

  if (isAiConfigured()) {
    const systemPrompt = `You are a completion-review copilot for service jobs.

Draft a concise completion summary and point out any evidence gaps.
Do not invent labour, materials, costs, or timestamps.
Keep the summary operator-ready and factual.

Respond ONLY with valid JSON:
{"summary":"...","proofSummary":"...","missingEvidenceFlags":["..."],"confidence":80}`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Request: ${job.serviceRequest.referenceNumber}
Property: ${job.serviceRequest.property?.name ?? "Unknown"} (${job.serviceRequest.property?.address ?? "N/A"})
Category: ${job.serviceRequest.category}
Original issue:
${job.serviceRequest.description}

Vendor notes:
${job.vendorNotes ?? "(none)"}

Job notes:
${job.notes.map((note) => `- ${note.text}`).join("\n") || "(none)"}

Materials:
${job.materials.map((material) => `- ${material.description} x${material.quantity}`).join("\n") || "(none)"}

Photos:
Before: ${job.photos.filter((photo) => photo.type === "BEFORE").length}
After: ${job.photos.filter((photo) => photo.type === "AFTER").length}
Other: ${job.photos.filter((photo) => !["BEFORE", "AFTER"].includes(photo.type)).length}

Structured totals:
Labour hours: ${job.totalLabourHours ?? "N/A"}
Materials cost: ${job.totalMaterialsCost ?? "N/A"}
Total cost: ${job.totalCost ?? "N/A"}`,
        },
      ],
      { temperature: 0.1, maxTokens: 700 }
    );

    const parsed = parseJsonObject(raw);
    if (parsed) {
      assist = {
        summary: normalizeString(parsed.summary, assist.summary),
        proofSummary: normalizeString(parsed.proofSummary, assist.proofSummary),
        missingEvidenceFlags: normalizeStringArray(parsed.missingEvidenceFlags, 5),
        confidence: normalizeConfidence(parsed.confidence, assist.confidence),
      };
      source = "ai";
    }
  }

  await saveAiArtifact({
    entityType: "JOB",
    entityId: jobId,
    action: AI_ARTIFACT_ACTIONS.COMPLETION_ASSIST,
    data: assist,
    source,
  });

  return {
    data: assist,
    createdAt: new Date().toISOString(),
    source,
  };
}

function buildCredentialHeuristicFlags(input: {
  type: string;
  credentialNumber: string;
  expiresAt: Date | null;
  documentUrl: string | null;
}) {
  const flags: string[] = [];

  if (!input.documentUrl) flags.push("No supporting document uploaded.");
  if (input.expiresAt && input.expiresAt < new Date()) {
    flags.push("Entered expiry date has already passed.");
  }
  if (input.type === "WSIB" && !/\d{6,}/.test(input.credentialNumber)) {
    flags.push("WSIB number format looks incomplete.");
  }
  if (input.documentUrl?.toLowerCase().endsWith(".pdf")) {
    flags.push("OCR extraction is limited for PDF documents in the current runtime.");
  }

  return flags;
}

function toDataUrl(bytes: Uint8Array, contentType: string): string {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function generateCredentialAssist(
  credentialId: string
): Promise<StoredAiArtifact<CredentialAssist>> {
  const cached = await getLatestAiArtifact<CredentialAssist>(
    "VENDOR_CREDENTIAL",
    credentialId,
    AI_ARTIFACT_ACTIONS.CREDENTIAL_REVIEW
  );
  if (cached) return cached;

  const credential = await prisma.vendorCredential.findUnique({
    where: { id: credentialId },
    include: {
      vendor: {
        select: {
          companyName: true,
        },
      },
    },
  });

  if (!credential) {
    throw new Error("Credential not found");
  }

  const flags = buildCredentialHeuristicFlags({
    type: credential.type,
    credentialNumber: credential.credentialNumber,
    expiresAt: credential.expiresAt,
    documentUrl: credential.documentUrl,
  });

  let assist: CredentialAssist = {
    extractedType: credential.type,
    extractedNumber: credential.credentialNumber || null,
    expiresAt: credential.expiresAt?.toISOString() ?? null,
    holderName: credential.vendor.companyName,
    flags,
    confidence: credential.documentUrl ? 0.45 : 0.25,
  };
  let source: "ai" | "heuristic" = "heuristic";

  if (
    isAiConfigured() &&
    credential.documentUrl &&
    credential.documentUrl.startsWith("/api/photos/")
  ) {
    try {
      const key = credential.documentUrl.replace(/^\/api\/photos\//, "");
      const file = await getFile(key);

      if (file?.contentType?.startsWith("image/")) {
        const raw = await chatCompletion(
          [
            {
              role: "system",
              content:
                "You are a credential-review copilot. Extract visible document details only. Do not infer verification. Respond ONLY with valid JSON: {\"extractedType\":null,\"extractedNumber\":null,\"expiresAt\":null,\"holderName\":null,\"flags\":[\"...\"],\"confidence\":80}",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Entered credential type: ${credential.type}
Entered credential number: ${credential.credentialNumber || "(blank)"}
Entered expiry date: ${credential.expiresAt?.toISOString() ?? "(blank)"}
Vendor company: ${credential.vendor.companyName}

Extract what is visibly readable from this image. If unreadable, use null. Also include mismatch or quality flags.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: toDataUrl(file.body, file.contentType),
                  },
                },
              ],
            },
          ],
          { temperature: 0.1, maxTokens: 700 }
        );

        const parsed = parseJsonObject(raw);
        if (parsed) {
          assist = {
            extractedType: normalizeString(parsed.extractedType) || credential.type,
            extractedNumber:
              normalizeString(parsed.extractedNumber) || credential.credentialNumber || null,
            expiresAt:
              normalizeString(parsed.expiresAt) || credential.expiresAt?.toISOString() || null,
            holderName:
              normalizeString(parsed.holderName) || credential.vendor.companyName,
            flags: Array.from(new Set([...flags, ...normalizeStringArray(parsed.flags, 6)])),
            confidence: normalizeConfidence(parsed.confidence, 0.75),
          };
          source = "ai";
        }
      }
    } catch (err) {
      console.error("[ai-assist] Credential assist failed:", err);
    }
  }

  await saveAiArtifact({
    entityType: "VENDOR_CREDENTIAL",
    entityId: credentialId,
    action: AI_ARTIFACT_ACTIONS.CREDENTIAL_REVIEW,
    data: assist,
    source,
  });

  return {
    data: assist,
    createdAt: new Date().toISOString(),
    source,
  };
}

function heuristicOpsInsights(snapshot: {
  totalRequests: number;
  requestsThisMonth: number;
  requestsByStatus: Array<{ status: string; count: number }>;
  requestsByCategory: Array<{ category: string; count: number }>;
  avgResolutionHours: string;
  disputedCount: number;
  pausedCount: number;
  declinedCount: number;
}) {
  const topCategory = snapshot.requestsByCategory[0];
  const openStatuses = snapshot.requestsByStatus
    .filter((row) => !["COMPLETED", "VERIFIED", "CANCELLED"].includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);

  const anomalies: string[] = [];
  if (snapshot.disputedCount > 0) {
    anomalies.push(`${snapshot.disputedCount} request(s) are currently disputed.`);
  }
  if (snapshot.pausedCount > 0) {
    anomalies.push(`${snapshot.pausedCount} job(s) are paused and need follow-up.`);
  }
  if (snapshot.declinedCount > 0) {
    anomalies.push(`${snapshot.declinedCount} request(s) were declined and may need redispatch review.`);
  }

  return {
    headline: `${openStatuses} active request(s) need attention across the platform.`,
    bullets: [
      `${snapshot.requestsThisMonth} request(s) were created this month.`,
      topCategory
        ? `${topCategory.category} is the busiest category right now.`
        : "No category trend is available yet.",
      `Average resolution time is ${snapshot.avgResolutionHours}.`,
    ],
    anomalies,
    recommendedActions: [
      "Review paused and declined work first to unblock operator follow-up.",
      "Use clarification before dispatch on low-context requests to reduce rework.",
    ],
  } satisfies OpsInsightSummary;
}

export async function getOrGenerateOpsInsightSummary(snapshot: {
  totalRequests: number;
  requestsThisMonth: number;
  requestsByStatus: Array<{ status: string; count: number }>;
  requestsByCategory: Array<{ category: string; count: number }>;
  avgResolutionHours: string;
  disputedCount: number;
  pausedCount: number;
  declinedCount: number;
}): Promise<StoredAiArtifact<OpsInsightSummary>> {
  const cached = await getLatestAiArtifact<OpsInsightSummary>(
    "SYSTEM",
    "admin-reports",
    AI_ARTIFACT_ACTIONS.OPS_INSIGHTS
  );

  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  if (cached && new Date(cached.createdAt).getTime() >= thirtyMinutesAgo) {
    return cached;
  }

  let summary = heuristicOpsInsights(snapshot);
  let source: "ai" | "heuristic" = "heuristic";

  if (isAiConfigured()) {
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You are an operations-insights copilot. Summarize platform workload, bottlenecks, and recommended next actions. Do not mention vendors by preference or ranking. Respond ONLY with valid JSON: {\"headline\":\"...\",\"bullets\":[\"...\"],\"anomalies\":[\"...\"],\"recommendedActions\":[\"...\"]}",
        },
        {
          role: "user",
          content: JSON.stringify(snapshot),
        },
      ],
      { temperature: 0.1, maxTokens: 700 }
    );

    const parsed = parseJsonObject(raw);
    if (parsed) {
      summary = {
        headline: normalizeString(parsed.headline, summary.headline),
        bullets: normalizeStringArray(parsed.bullets, 4),
        anomalies: normalizeStringArray(parsed.anomalies, 4),
        recommendedActions: normalizeStringArray(parsed.recommendedActions, 4),
      };
      source = "ai";
    }
  }

  await saveAiArtifact({
    entityType: "SYSTEM",
    entityId: "admin-reports",
    action: AI_ARTIFACT_ACTIONS.OPS_INSIGHTS,
    data: summary,
    source,
  });

  return {
    data: summary,
    createdAt: new Date().toISOString(),
    source,
  };
}

export function canUpdateRequestStatusForClarification(status: string) {
  return PRE_DISPATCH_STATUSES.has(status);
}
