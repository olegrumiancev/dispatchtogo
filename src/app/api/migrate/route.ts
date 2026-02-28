import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ONE-TIME migration endpoint — will be deleted after use
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== "dtg-migrate-2026-02-28") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // 1. Add updatedAt to User table if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
      results.push("OK: Added updatedAt to User table");
    } catch (e: any) {
      results.push(`SKIP User.updatedAt: ${e.message}`);
    }

    // 2. Add updatedAt to Vendor table if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
      results.push("OK: Added updatedAt to Vendor table");
    } catch (e: any) {
      results.push(`SKIP Vendor.updatedAt: ${e.message}`);
    }

    // 3. Add credentialNumber to VendorCredential if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "VendorCredential" ADD COLUMN IF NOT EXISTS "credentialNumber" TEXT NOT NULL DEFAULT ''
      `);
      results.push("OK: Added credentialNumber to VendorCredential table");
    } catch (e: any) {
      results.push(`SKIP VendorCredential.credentialNumber: ${e.message}`);
    }

    // 4. Convert VendorCredential.type from enum to text
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "VendorCredential" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT
      `);
      results.push("OK: Converted VendorCredential.type to TEXT");
    } catch (e: any) {
      results.push(`SKIP VendorCredential.type: ${e.message}`);
    }

    // 5. Convert VendorSkill.category from enum to text
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "VendorSkill" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT
      `);
      results.push("OK: Converted VendorSkill.category to TEXT");
    } catch (e: any) {
      results.push(`SKIP VendorSkill.category: ${e.message}`);
    }

    // 6. Convert ServiceRequest.category from enum to text
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ServiceRequest" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT
      `);
      results.push("OK: Converted ServiceRequest.category to TEXT");
    } catch (e: any) {
      results.push(`SKIP ServiceRequest.category: ${e.message}`);
    }

    // 7. Add paidAt to Invoice if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3)
      `);
      results.push("OK: Added paidAt to Invoice table");
    } catch (e: any) {
      results.push(`SKIP Invoice.paidAt: ${e.message}`);
    }

    // 8. Drop stale enum types that are no longer needed
    for (const enumName of ['ServiceCategory', 'CredentialType', 'SkillCategory']) {
      try {
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${enumName}" CASCADE`);
        results.push(`OK: Dropped enum ${enumName}`);
      } catch (e: any) {
        results.push(`SKIP ${enumName}: ${e.message}`);
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
