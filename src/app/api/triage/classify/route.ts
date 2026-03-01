import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chatCompletion, isAiConfigured } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/triage/classify
 *
 * Pre-submission AI classification. Takes a plain-text description
 * (and optional property context) and returns suggested category,
 * urgency, summary, confidence — without creating a service request.
 *
 * Used by the new request form so the operator can review AI
 * suggestions before submitting.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { description, propertyId } = body;

  if (!description || typeof description !== "string" || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 }
    );
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured" },
      { status: 503 }
    );
  }

  // Fetch property context (optional) and available vendor categories
  const [property, vendorCategories] = await Promise.all([
    propertyId
      ? prisma.property.findUnique({
          where: { id: propertyId },
          select: { name: true, address: true },
        })
      : null,
    prisma.vendorSkill
      .findMany({ select: { category: true }, distinct: ["category"] })
      .then((rows) => rows.map((r) => r.category)),
  ]);

  // Fall back to all known categories if no vendors have skills yet
  const categories =
    vendorCategories.length > 0
      ? vendorCategories
      : [
          "PLUMBING",
          "ELECTRICAL",
          "HVAC",
          "APPLIANCE",
          "LOCKSMITH",
          "SNOW_REMOVAL",
          "LANDSCAPING",
          "CLEANING",
          "DOCK_MARINA",
          "STRUCTURAL",
          "PEST",
          "GENERAL",
          "OTHER",
        ];

  const systemPrompt = `You are a service request triage assistant for a tourism property management platform in Cornwall & SDG, Ontario, Canada.

An operator has described a maintenance or service issue. Your job is to classify it BEFORE submission.

Analyse the description and return:
1. category — the best matching category from: ${categories.join(", ")}
2. urgency — one of: LOW, MEDIUM, HIGH, EMERGENCY
3. summary — a clear one-line summary of the issue (max 80 chars)
4. confidence — a score from 0 to 100 for how confident you are in the category
5. reasoning — 1-2 sentences explaining your classification
6. requiresLicensedTrade — true/false whether this likely requires a licensed tradesperson (plumber, electrician, HVAC tech)

Respond ONLY with valid JSON (no markdown, no code fences):
{"category":"...","urgency":"...","summary":"...","confidence":85,"reasoning":"...","requiresLicensedTrade":false}`;

  const propertyContext = property
    ? `Property: ${property.name} (${property.address ?? "N/A"})\n\n`
    : "";

  const userPrompt = `${propertyContext}Description: ${description.trim()}`;

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1, maxTokens: 512 }
    );

    if (!raw) {
      return NextResponse.json(
        { error: "AI did not return a response" },
        { status: 503 }
      );
    }

    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const result = JSON.parse(cleaned);

    // Normalise confidence to 0-1 if the model returned 0-100
    const confidence =
      typeof result.confidence === "number" && result.confidence > 1
        ? result.confidence / 100
        : result.confidence ?? 0.5;

    return NextResponse.json({
      category: result.category ?? "GENERAL",
      urgency: result.urgency ?? "MEDIUM",
      summary: result.summary ?? "",
      confidence,
      reasoning: result.reasoning ?? "",
      requiresLicensedTrade: result.requiresLicensedTrade ?? false,
    });
  } catch (err: any) {
    console.error("[triage/classify] Error:", err);
    return NextResponse.json(
      { error: "Failed to classify — AI returned invalid data" },
      { status: 502 }
    );
  }
}
