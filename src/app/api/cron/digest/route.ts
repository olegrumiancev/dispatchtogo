/**
 * POST /api/cron/digest
 *
 * HTTP trigger for the daily digest job. Called by:
 *   - Vercel Cron (configured in vercel.json — runs at 17:00 UTC daily)
 *   - Dokploy HTTP Cron:
 *       Schedule: 0 17 * * *
 *       Command:  curl -X POST https://app.yourdomain.com/api/cron/digest \
 *                      -H "Authorization: Bearer $CRON_SECRET"
 *
 * Security: bearer token (CRON_SECRET env var) validated by isCronAuthorized().
 * The API subdomain restriction in middleware.ts provides a second layer.
 */

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-guard";
import { runDigestJob } from "./job";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/digest] Job started.");
    const result = await runDigestJob();
    console.log(`[cron/digest] Done. Operators: ${result.operatorsSent}, Vendors: ${result.vendorsSent}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron/digest] Unhandled error:", err?.message ?? err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow GET for a quick health-check (returns 401 without the secret)
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, message: "Digest cron route is live." });
}
