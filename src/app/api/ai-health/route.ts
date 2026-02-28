import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAiConfigured, chatCompletion } from "@/lib/ai-client";

/**
 * GET /api/ai-health
 * Admin-only: test AI connectivity and CF Access.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configured = isAiConfigured();
  const baseUrl = process.env.AI_BASE_URL || "(not set)";
  const model = process.env.AI_MODEL || "(not set)";
  const hasCfId = !!process.env.CF_ACCESS_CLIENT_ID;
  const hasCfSecret = !!process.env.CF_ACCESS_CLIENT_SECRET;

  if (!configured) {
    return NextResponse.json({
      status: "not_configured",
      baseUrl,
      model,
      hasCfId,
      hasCfSecret,
    });
  }

  // Try a minimal completion
  try {
    const result = await chatCompletion(
      [{ role: "user", content: "Reply with exactly: OK" }],
      { temperature: 0, maxTokens: 10 }
    );

    return NextResponse.json({
      status: result ? "ok" : "failed",
      baseUrl,
      model,
      hasCfId,
      hasCfSecret,
      aiResponse: result,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      baseUrl,
      model,
      hasCfId,
      hasCfSecret,
      error: err.message || String(err),
    });
  }
}
