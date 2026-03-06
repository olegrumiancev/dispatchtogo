/**
 * Cron request guard — validates the Authorization header against CRON_SECRET.
 *
 * Works identically on Vercel and Dokploy (or any HTTP-based cron trigger):
 *
 *   Vercel:  vercel.json cron calls the URL automatically with no extra headers,
 *            so we also accept requests from the Vercel cron user-agent when
 *            VERCEL_CRON_SECRET is injected by Vercel's infra.
 *
 *   Dokploy: In Dokploy → Cron Jobs, add:
 *              URL:     POST https://app.yourdomain.com/api/cron/digest
 *              Header:  Authorization: Bearer <CRON_SECRET value from .env>
 *              Schedule: 0 17 * * *
 *            No code changes required when migrating from Vercel to Dokploy.
 *
 *   node-cron in-process (single-container Dokploy alternative):
 *     Set CRON_MODE=inprocess in your environment. The scheduler will be
 *     initialised from src/instrumentation.ts using node-cron, calling the
 *     same digest logic directly without going through HTTP.
 */

import type { NextRequest } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

/**
 * Returns true when the request carries valid cron credentials.
 * Accepts:
 *   1. Bearer token in Authorization header matching CRON_SECRET
 *   2. Vercel's built-in cron header (automatically injected by Vercel infra)
 */
export function isCronAuthorized(request: NextRequest): boolean {
  // Vercel injects this header automatically for cron invocations
  const vercelCronSecret = request.headers.get("x-vercel-cron-signature");
  if (vercelCronSecret && process.env.VERCEL_CRON_SECRET) {
    return vercelCronSecret === process.env.VERCEL_CRON_SECRET;
  }

  // Standard Bearer token — used by Dokploy and any HTTP cron trigger
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return CRON_SECRET.length > 0 && token === CRON_SECRET;
}
