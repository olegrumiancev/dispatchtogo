import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrganizationUsageForPeriod, currentPeriodStart, currentPeriodEnd } from "@/lib/billing";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role: string; organizationId?: string };
  if (user.role !== "OPERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.organizationId) {
    return NextResponse.json({ error: "No organization linked" }, { status: 400 });
  }

  const usage = await getOrganizationUsageForPeriod(
    user.organizationId,
    currentPeriodStart(),
    currentPeriodEnd()
  );

  return NextResponse.json(usage);
}
