import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/db-health
 *
 * Quick database connectivity check. Safe to call in production — returns no
 * sensitive data. Response time is included so you can gauge connection latency.
 *
 * Returns:
 *   200 { ok: true,  latencyMs: number, dbUrl: string (host only) }
 *   500 { ok: false, error: string, dbUrl: string (host only) }
 */
export async function GET() {
  const rawUrl = process.env.DATABASE_URL ?? "";

  // Redact credentials — show only host:port/dbname for diagnostics
  let safeUrl = "(DATABASE_URL not set)";
  try {
    if (rawUrl) {
      const u = new URL(rawUrl);
      safeUrl = `${u.host}${u.pathname}`;
    }
  } catch {
    safeUrl = "(invalid DATABASE_URL)";
  }

  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - start,
      dbUrl: safeUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        dbUrl: safeUrl,
      },
      { status: 500 }
    );
  }
}
