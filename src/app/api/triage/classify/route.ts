import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai-client";
import { runClarificationCopilot } from "@/lib/ai-assist";
import { getServiceCategories } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

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

  const [property, vendorCategories] = await Promise.all([
    propertyId
      ? prisma.property.findUnique({
          where: { id: propertyId },
          select: { name: true, address: true },
        })
      : null,
    prisma.vendorSkill
      .findMany({ select: { category: true }, distinct: ["category"] })
      .then((rows) => rows.map((row) => row.category)),
  ]);

  const configuredCategories = (await getServiceCategories()).map((category) => category.value);
  const categories = vendorCategories.length > 0 ? vendorCategories : configuredCategories;

  try {
    const result = await runClarificationCopilot({
      description: description.trim(),
      property,
      categories,
    });

    return NextResponse.json({
      category: result.category,
      urgency: result.urgency,
      summary: result.summary,
      confidence: result.confidence,
      reasoning: result.reasoning,
      requiresLicensedTrade: result.requiresLicensedTrade,
      statusSuggestion: result.statusSuggestion ?? "READY_TO_DISPATCH",
      clarifyingQuestions: result.clarifyingQuestions,
    });
  } catch (err: any) {
    console.error("[triage/classify] Error:", err);
    return NextResponse.json(
      { error: "Failed to classify - AI returned invalid data" },
      { status: 502 }
    );
  }
}
