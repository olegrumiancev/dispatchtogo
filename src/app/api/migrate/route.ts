import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary migration endpoint to align existing DB with current Prisma schema
// DELETE THIS FILE after migration is complete
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("x-migration-key");
  if (authHeader !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // 1. Add updatedAt to User table if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
      results.push("Added updatedAt to User table");
    } catch (e: any) {
      results.push(`User.updatedAt: ${e.message}`);
    }

    // 2. Add updatedAt to Vendor table if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
      results.push("Added updatedAt to Vendor table");
    } catch (e: any) {
      results.push(`Vendor.updatedAt: ${e.message}`);
    }

    // 3. Add credentialNumber to VendorCredential if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "VendorCredential" ADD COLUMN IF NOT EXISTS "credentialNumber" TEXT NOT NULL DEFAULT ''
      `);
      results.push("Added credentialNumber to VendorCredential table");
    } catch (e: any) {
      results.push(`VendorCredential.credentialNumber: ${e.message}`);
    }

    // 4. Convert VendorCredential.type from enum to text
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "VendorCredential" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT
      `);
      results.push("Converted VendorCredential.type to TEXT");
    } catch (e: any) {
      results.push(`VendorCredential.type conversion: ${e.message}`);
    }

    // 5. Convert VendorSkill.category from enum to text
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "VendorSkill" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT
      `);
      results.push("Converted VendorSkill.category to TEXT");
    } catch (e: any) {
      results.push(`VendorSkill.category conversion: ${e.message}`);
    }

    // 6. Convert ServiceRequest.category from enum to text
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ServiceRequest" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT
      `);
      results.push("Converted ServiceRequest.category to TEXT");
    } catch (e: any) {
      results.push(`ServiceRequest.category conversion: ${e.message}`);
    }

    // 7. Add paidAt to Invoice if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3)
      `);
      results.push("Added paidAt to Invoice table");
    } catch (e: any) {
      results.push(`Invoice.paidAt: ${e.message}`);
    }

    // 8. Drop stale enum types that are no longer needed
    const staleEnums = ['ServiceCategory', 'CredentialType', 'SkillCategory'];
    for (const enumName of staleEnums) {
      try {
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${enumName}" CASCADE`);
        results.push(`Dropped enum ${enumName}`);
      } catch (e: any) {
        results.push(`Drop ${enumName}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, results },
      { status: 500 }
    );
  }
}
