/**
 * Scheduler abstraction layer.
 *
 * Current platform: Vercel Cron (configured in vercel.json).
 * No in-process scheduling is needed — Vercel calls /api/cron/digest via HTTP.
 *
 * ── Switching to Dokploy ────────────────────────────────────────────────────
 *
 * Option A — Dokploy HTTP Cron (recommended, zero code changes):
 *   In Dokploy → Application → Cron Jobs, add:
 *     Name:     Daily Digest
 *     Schedule: 0 17 * * *   (5 PM UTC daily)
 *     Command:  curl -X POST https://app.yourdomain.com/api/cron/digest \
 *                    -H "Authorization: Bearer $CRON_SECRET"
 *   This is identical to how Vercel calls the route. No code changes needed.
 *
 * Option B — In-process node-cron (single-container, no external HTTP trigger):
 *   1. Run:  npm install node-cron
 *            npm install --save-dev @types/node-cron
 *   2. Set:  CRON_MODE=inprocess  in your .env
 *   3. In src/instrumentation.ts, add inside the nodejs block:
 *        if (process.env.CRON_MODE === "inprocess") {
 *          const { initInProcessScheduler } = await import("@/lib/scheduler");
 *          initInProcessScheduler();
 *        }
 *   4. Uncomment the initInProcessScheduler export below.
 *
 * The digest logic itself lives in src/app/api/cron/digest/route.ts and is
 * platform-agnostic — it runs identically whether called via HTTP or in-process.
 */

export const SCHEDULER_INFO = {
  platform: (process.env.CRON_MODE === "inprocess" ? "node-cron" : "http") as "http" | "node-cron",
  cronExpression: process.env.DIGEST_CRON_SCHEDULE ?? "0 17 * * *",
};

/**
 * Uncomment and use this when CRON_MODE=inprocess (Dokploy Option B).
 *
 * Requires: npm install node-cron @types/node-cron
 *
 * export async function initInProcessScheduler(): Promise<void> {
 *   const cron = await import("node-cron");
 *   const { runDigestJob } = await import("@/app/api/cron/digest/job");
 *
 *   cron.schedule(SCHEDULER_INFO.cronExpression, async () => {
 *     console.log("[scheduler] Running in-process digest job...");
 *     try {
 *       await runDigestJob();
 *       console.log("[scheduler] Digest job complete.");
 *     } catch (err) {
 *       console.error("[scheduler] Digest job failed:", err);
 *     }
 *   }, { timezone: "UTC" });
 *
 *   console.log(
 *     `[scheduler] In-process cron initialised. Schedule: ${SCHEDULER_INFO.cronExpression} UTC`
 *   );
 * }
 */
