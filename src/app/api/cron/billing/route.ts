/**
 * POST /api/cron/billing  (also accepts GET for manual testing)
 *
 * Generates DRAFT PlatformBill records for the previous calendar month.
 * Admin reviews and sends bills manually via the admin billing page.
 *
 * Dokploy cron schedule: 0 2 1 * *  (2:00 AM UTC on the 1st of each month)
 *
 * Curl example:
 *   curl -s -X POST https://app.dispatchtogo.com/api/cron/billing \
 *        -H "Authorization: Bearer $CRON_SECRET"
 */
import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-guard";
import { runBillingJob } from "./job";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runBillingJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/billing] Job failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
