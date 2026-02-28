import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== "dtg-debug-v2") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Check all table columns
  const tables = ['Property', 'ServiceRequest', 'Job', 'ProofPacket', 'Invoice', 'Photo', 'JobNote', 'JobMaterial'];
  for (const table of tables) {
    try {
      const cols = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = '${table}' ORDER BY ordinal_position
      `) as any[];
      results[`${table}_columns`] = cols.map((c: any) => `${c.column_name}(${c.data_type},${c.is_nullable})`);
    } catch (e: any) {
      results[`${table}_error`] = e.message;
    }
  }

  // Try simple queries to identify which ones fail
  const tests = [
    ['property_count', () => prisma.property.count()],
    ['serviceRequest_count', () => prisma.serviceRequest.count()],
    ['job_count', () => prisma.job.count()],
    ['invoice_count', () => prisma.invoice.count()],
    ['proofPacket_count', () => prisma.proofPacket.count()],
    ['notification_count', () => prisma.notification.count()],
    ['vendor_count', () => prisma.vendor.count()],
  ] as [string, () => Promise<any>][];

  for (const [label, fn] of tests) {
    try {
      results[label] = await fn();
    } catch (e: any) {
      results[label] = `ERROR: ${e.message.substring(0, 200)}`;
    }
  }

  return NextResponse.json(results, { status: 200 });
}
