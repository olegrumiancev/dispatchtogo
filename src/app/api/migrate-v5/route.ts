import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const results: string[] = [];

  const steps = [
    // VendorCredential: rename expiryDate -> expiresAt, isVerified -> verified
    `ALTER TABLE "VendorCredential" RENAME COLUMN "expiryDate" TO "expiresAt"`,
    `ALTER TABLE "VendorCredential" RENAME COLUMN "isVerified" TO "verified"`,
    
    // Check if there are other missing columns across all tables
    // Let's also check Badge component variant issue - it expects string but used as className
  ];

  for (const sql of steps) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`OK: ${sql}`);
    } catch (e: any) {
      results.push(`ERR: ${sql.substring(0, 80)} -> ${e.message.substring(0, 200)}`);
    }
  }

  // Verify
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'VendorCredential'
      ORDER BY ordinal_position
    `) as any[];
    results.push(`VendorCredential columns: ${cols.map((c: any) => c.column_name).join(', ')}`);
  } catch (e: any) {
    results.push(`Verify error: ${e.message.substring(0, 200)}`);
  }

  return NextResponse.json({ results });
}
