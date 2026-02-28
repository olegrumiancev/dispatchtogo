import { prisma } from "@/lib/prisma";
import { chatCompletion, isAiConfigured } from "@/lib/ai-client";

interface TriageResult {
  suggestedCategory: string;
  confidence: number;
  urgencyScore: number;
  reasoning: string;
  summary: string;
}

/**
 * AI-powered triage for incoming service requests.
 *
 * Analyses the description and returns:
 *  - Suggested category (matched against active vendor skills)
 *  - Confidence score (0-100)
 *  - Urgency score (1-5)
 *  - Short reasoning
 *  - One-line summary
 *
 * Results are stored in AiClassification + ServiceRequest fields.
 * If AI is not configured or the call fails, this is a no-op.
 */
export async function triageServiceRequest(
  serviceRequestId: string
): Promise<TriageResult | null> {
  if (!isAiConfigured()) return null;

  // Fetch the request and available vendor categories
  const [request, vendorCategories] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: {
        description: true,
        category: true,
        urgency: true,
        property: { select: { name: true, address: true } },
      },
    }),
    prisma.vendorSkill
      .findMany({ select: { category: true }, distinct: ["category"] })
      .then((rows) => rows.map((r) => r.category)),
  ]);

  if (!request) return null;

  const systemPrompt = `You are a service request triage assistant for a tourism property management platform in Cornwall & SDG, Ontario, Canada.

Your job is to analyse incoming maintenance/service requests and provide:
1. The best matching vendor category from the available list
2. A confidence score (0-100) for your category suggestion
3. An urgency score (1-5): 1=routine, 2=low, 3=medium, 4=high, 5=emergency
4. A brief reasoning (1-2 sentences)
5. A one-line summary of the issue

Available vendor categories: ${vendorCategories.join(", ")}

The operator already selected category "${request.category}" and urgency "${request.urgency}".
You may agree or suggest a different/more specific category if one fits better.

Respond ONLY with valid JSON (no markdown, no code fences):
{"suggestedCategory":"...","confidence":85,"urgencyScore":3,"reasoning":"...","summary":"..."}`;

  const userPrompt = `Property: ${request.property?.name ?? "Unknown"} (${request.property?.address ?? "N/A"})

Description: ${request.description}`;

  const raw = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.1, maxTokens: 512 }
  );

  if (!raw) return null;

  let result: TriageResult;
  try {
    // Strip markdown code fences if the model adds them anyway
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    result = JSON.parse(cleaned);
  } catch {
    console.error("[ai-triage] Failed to parse AI response:", raw);
    return null;
  }

  // Persist results
  try {
    await prisma.$transaction([
      prisma.aiClassification.create({
        data: {
          requestId: serviceRequestId,
          suggestedCategory: result.suggestedCategory,
          confidence: result.confidence / 100, // store as 0-1 float
          reasoning: result.reasoning,
        },
      }),
      prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          aiTriageSummary: result.summary,
          aiUrgencyScore: result.urgencyScore,
        },
      }),
    ]);
  } catch (err) {
    console.error("[ai-triage] Failed to persist results:", err);
  }

  return result;
}
