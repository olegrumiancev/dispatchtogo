import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const results: string[] = [];

  const steps = [
    // Fix User.role: still enum UserRole, needs to be TEXT
    `ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT`,
    // Fix Organization.type: still enum OrganizationType, needs to be TEXT  
    `ALTER TABLE "Organization" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT`,
    // Drop old enum types that are no longer used
    `DROP TYPE IF EXISTS "UserRole" CASCADE`,
    `DROP TYPE IF EXISTS "OrganizationType" CASCADE`,
    `DROP TYPE IF EXISTS "UrgencyLevel" CASCADE`,
    // Also drop any other remaining enum types from the old schema
    `DROP TYPE IF EXISTS "RequestStatus" CASCADE`,
    `DROP TYPE IF EXISTS "JobStatus" CASCADE`,
    `DROP TYPE IF EXISTS "PhotoType" CASCADE`,
    `DROP TYPE IF EXISTS "InvoiceStatus" CASCADE`,
    `DROP TYPE IF EXISTS "Urgency" CASCADE`,
  ];

  for (const sql of steps) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`OK: ${sql.substring(0, 80)}`);
    } catch (e: any) {
      results.push(`ERR: ${sql.substring(0, 80)} -> ${e.message.substring(0, 200)}`);
    }
  }

  return NextResponse.json({ results });
}
