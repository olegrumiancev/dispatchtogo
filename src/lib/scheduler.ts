/**
 * Scheduler abstraction layer.
 *
 * Platform: Dokploy HTTP Cron (vercel.json crons are ignored on Dokploy).
 *
 * ── Dokploy HTTP Cron setup (Option A — recommended) ───────────────────────
 *
 * In Dokploy → Application → Cron Jobs, add one entry per job:
 *
 *   1. Daily Digest
 *      Schedule: 0 17 * * *
 *      Command:  curl -s -X POST https://app.yourdomain.com/api/cron/digest \
 *                     -H "Authorization: Bearer $CRON_SECRET"
 *
 *   2. Credential Expiry Invalidation
 *      Schedule: 0 8 * * *
 *      Command:  curl -s -X POST https://app.yourdomain.com/api/cron/credential-expiry \
 *                     -H "Authorization: Bearer $CRON_SECRET"
 *
 * CRON_SECRET must be set in your Dokploy environment variables.
 * All cron routes validate it via isCronAuthorized() in lib/cron-guard.ts.
 *
 * ── Option B — In-process node-cron (single-container alternative) ──────────
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
 * All job logic is platform-agnostic and lives in the job.ts files alongside
 * each route, so it runs identically whether triggered via HTTP or in-process.
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
 *   const { runCredentialExpiryJob } = await import("@/app/api/cron/credential-expiry/job");
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
 *   // Credential expiry: run daily at 08:00 UTC
 *   cron.schedule("0 8 * * *", async () => {
 *     console.log("[scheduler] Running credential expiry job...");
 *     try {
 *       await runCredentialExpiryJob();
 *       console.log("[scheduler] Credential expiry job complete.");
 *     } catch (err) {
 *       console.error("[scheduler] Credential expiry job failed:", err);
 *     }
 *   }, { timezone: "UTC" });
 *
 *   console.log(
 *     `[scheduler] In-process cron initialised. Schedule: ${SCHEDULER_INFO.cronExpression} UTC`
 *   );
 * }
 */
