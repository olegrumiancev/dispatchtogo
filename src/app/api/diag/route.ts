import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const results: string[] = [];

  // Clear prepared statement caches that reference old enum types
  const steps = [
    `DISCARD ALL`,
  ];

  for (const sql of steps) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`OK: ${sql}`);
    } catch (e: any) {
      results.push(`ERR: ${sql} -> ${e.message.substring(0, 200)}`);
    }
  }

  // Verify column types
  try {
    const colTypes = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('role', 'type', 'status', 'urgency')
        AND data_type = 'USER-DEFINED'
      ORDER BY table_name
    `) as any[];
    results.push(`Remaining enum columns: ${colTypes.length}`);
    if (colTypes.length > 0) {
      results.push(JSON.stringify(colTypes));
    }
  } catch (e: any) {
    results.push(`Verify error: ${e.message.substring(0, 200)}`);
  }

  // Check remaining enum types
  try {
    const enums = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT t.typname
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `) as any[];
    results.push(`Remaining enum types: ${enums.map((e: any) => e.typname).join(', ') || 'none'}`);
  } catch (e: any) {
    results.push(`Enum check error: ${e.message.substring(0, 200)}`);
  }

  // Test user query
  try {
    const user = await prisma.user.findUnique({ where: { email: 'testvendor2@dispatchtogo.com' } });
    results.push(`User query: ${user ? `found ${user.email} role=${user.role}` : 'not found'}`);
  } catch (e: any) {
    results.push(`User query error: ${e.message.substring(0, 200)}`);
  }

  return NextResponse.json({ results });
}
