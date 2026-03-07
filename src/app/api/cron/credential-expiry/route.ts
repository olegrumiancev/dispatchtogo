/**
 * POST /api/cron/credential-expiry
 *
 * Invalidates credentials whose expiresAt has passed and notifies vendors.
 *
 * Dokploy HTTP Cron setup:
 *   In Dokploy → Application → Cron Jobs, add:
 *     Schedule: 0 8 * * *
 *     Command:  curl -s -X POST https://app.yourdomain.com/api/cron/credential-expiry \
 *                    -H "Authorization: Bearer $CRON_SECRET"
 *
 * (vercel.json also has this entry but is ignored on Dokploy.)
 */

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-guard";
import { runCredentialExpiryJob } from "./job";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/credential-expiry] Job started.");
    const result = await runCredentialExpiryJob();
    console.log(`[cron/credential-expiry] Done. Invalidated: ${result.invalidated}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron/credential-expiry] Unhandled error:", err?.message ?? err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, message: "Credential expiry cron route is live." });
}
