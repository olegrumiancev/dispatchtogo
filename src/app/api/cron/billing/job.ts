/**
 * runBillingJob — generates DRAFT PlatformBill records for the previous
 * calendar month for all organizations with billable activity.
 *
 * Triggered by POST /api/cron/billing on the 1st of each month.
 * Admin must review and manually send bills via the admin billing page.
 */
import { generatePlatformBills } from "@/lib/billing";

function previousMonthBounds(): { start: Date; end: Date } {
  const now = new Date();
  // First day of current month UTC
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // Last millisecond of previous month = one ms before first of this month
  const endOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
  // First day of previous month
  const startOfLastMonth = new Date(Date.UTC(endOfLastMonth.getUTCFullYear(), endOfLastMonth.getUTCMonth(), 1));
  return { start: startOfLastMonth, end: new Date(Date.UTC(endOfLastMonth.getUTCFullYear(), endOfLastMonth.getUTCMonth() + 1, 1)) };
}

export interface BillingJobResult {
  period: string;
  created: number;
  updated: number;
}

export async function runBillingJob(): Promise<BillingJobResult> {
  const { start, end } = previousMonthBounds();
  const period = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;

  console.log(`[billing-cron] Generating draft bills for period ${period}...`);
  const result = await generatePlatformBills(start, end);

  console.log(`[billing-cron] Done. Created: ${result.created}, Updated: ${result.updated}`);
  return { period, ...result };
}
