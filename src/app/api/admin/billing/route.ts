import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrganizationUsageForPeriod, parsePeriod, generatePlatformBills, generateDraftBillForOrg, currentPeriodStart, currentPeriodEnd } from "@/lib/billing";
import { BILLING_PLANS } from "@/lib/constants";

/**
 * GET /api/admin/billing?month=YYYY-MM
 * Returns all organizations with their PlatformBill (or live usage) for the month.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // e.g. "2026-02"

  let periodStart: Date;
  let periodEnd: Date;

  if (monthParam) {
    ({ periodStart, periodEnd } = parsePeriod(monthParam));
  } else {
    periodStart = currentPeriodStart();
    periodEnd = currentPeriodEnd();
  }

  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      plan: true,
      contactEmail: true,
      billingEmail: true,
      stripeCustomerId: true,
      platformBills: {
        where: { periodStart },
        take: 1,
      },
    },
  });

  const rows = await Promise.all(
    orgs.map(async (org) => {
      const bill = org.platformBills[0] ?? null;
      let usage: Awaited<ReturnType<typeof getOrganizationUsageForPeriod>> | null = null;

      if (!bill) {
        usage = await getOrganizationUsageForPeriod(org.id, periodStart, periodEnd);
      }

      const planConfig = BILLING_PLANS[org.plan] ?? BILLING_PLANS["FREE"];

      return {
        orgId: org.id,
        orgName: org.name,
        plan: org.plan,
        planLabel: planConfig.label,
        contactEmail: org.billingEmail ?? org.contactEmail,
        stripeCustomerId: org.stripeCustomerId,
        bill,
        liveUsage: usage,
      };
    })
  );

  return NextResponse.json({ periodStart, periodEnd, rows });
}

/**
 * POST /api/admin/billing
 * body: { action: "generate", month: "YYYY-MM" }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  if (body.action === "generate") {
    const monthParam: string = body.month;
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
    }

    const { periodStart, periodEnd } = parsePeriod(monthParam);
    const result = await generatePlatformBills(periodStart, periodEnd);
    return NextResponse.json({ ok: true, ...result });
  }

  if (body.action === "generate-draft") {
    const { orgId, month: monthParam } = body as { orgId?: string; month?: string };
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
    }
    try {
      const { periodStart, periodEnd } = parsePeriod(monthParam);
      const result = await generateDraftBillForOrg(orgId, periodStart, periodEnd);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generate draft failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
