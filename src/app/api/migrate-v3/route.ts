import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== "dtg-migrate-v3") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  const run = async (label: string, sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`OK: ${label}`);
    } catch (e: any) {
      results.push(`SKIP ${label}: ${e.message.substring(0, 150)}`);
    }
  };

  // ── Property ────────────────────────────────────────────────────
  await run('Property.createdAt', `ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await run('Property.address NOT NULL', `ALTER TABLE "Property" ALTER COLUMN "address" SET NOT NULL`);
  // Set empty addresses to something valid first
  await run('Property.address defaults', `UPDATE "Property" SET "address" = 'TBD' WHERE "address" IS NULL`);

  // ── ServiceRequest ─────────────────────────────────────────────
  // Rename aiSummary -> aiTriageSummary
  await run('SR.aiTriageSummary rename', `ALTER TABLE "ServiceRequest" RENAME COLUMN "aiSummary" TO "aiTriageSummary"`);
  // Add aiUrgencyScore
  await run('SR.aiUrgencyScore', `ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "aiUrgencyScore" INTEGER`);

  // ── Job ─────────────────────────────────────────────────────────
  // Add status column (was missing!)
  await run('Job.status', `ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'OFFERED'`);
  // organizationId nullable
  await run('Job.orgId nullable', `ALTER TABLE "Job" ALTER COLUMN "organizationId" DROP NOT NULL`);

  // ── Photo ──────────────────────────────────────────────────────
  await run('Photo.createdAt', `ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  // Convert Photo.type from enum to text
  await run('Photo.type to TEXT', `ALTER TABLE "Photo" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT`);
  // Set default for Photo.type
  await run('Photo.type default', `ALTER TABLE "Photo" ALTER COLUMN "type" SET DEFAULT 'INTAKE'`);

  // ── JobNote ─────────────────────────────────────────────────────
  // Rename authorId -> userId
  await run('JobNote.userId rename', `ALTER TABLE "JobNote" RENAME COLUMN "authorId" TO "userId"`);

  // ── JobMaterial ─────────────────────────────────────────────────
  // Change quantity from integer to float
  await run('JobMaterial.quantity to float', `ALTER TABLE "JobMaterial" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::DOUBLE PRECISION`);
  await run('JobMaterial.createdAt', `ALTER TABLE "JobMaterial" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);

  // ── ProofPacket ─────────────────────────────────────────────────
  // Make pdfUrl nullable
  await run('ProofPacket.pdfUrl nullable', `ALTER TABLE "ProofPacket" ALTER COLUMN "pdfUrl" DROP NOT NULL`);

  // ── Job status enum -> text (it may be using JobStatus enum) ──
  // The Job.status column was just added as TEXT, but if it existed before as enum:
  await run('Drop old JobStatus if unused', `-- no-op, status was just added as TEXT`);

  // ── Convert Urgency enum to text on ServiceRequest ──
  await run('SR.urgency to TEXT', `ALTER TABLE "ServiceRequest" ALTER COLUMN "urgency" TYPE TEXT USING "urgency"::TEXT`);
  await run('SR.urgency default', `ALTER TABLE "ServiceRequest" ALTER COLUMN "urgency" SET DEFAULT 'MEDIUM'`);

  // ── Convert Status enum to text on ServiceRequest ──
  await run('SR.status to TEXT', `ALTER TABLE "ServiceRequest" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT`);
  await run('SR.status default', `ALTER TABLE "ServiceRequest" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED'`);

  // ── Convert InvoiceStatus enum to text on Invoice ──
  await run('Invoice.status to TEXT', `ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT`);
  await run('Invoice.status default', `ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);

  // ── Drop old enum types ──
  for (const e of ['Urgency', 'RequestStatus', 'JobStatus', 'InvoiceStatus', 'PhotoType']) {
    await run(`Drop enum ${e}`, `DROP TYPE IF EXISTS "${e}" CASCADE`);
  }

  // ── Indexes for ServiceRequest ──
  await run('SR org idx', `CREATE INDEX IF NOT EXISTS "ServiceRequest_organizationId_idx" ON "ServiceRequest"("organizationId")`);
  await run('SR status idx', `CREATE INDEX IF NOT EXISTS "ServiceRequest_status_idx" ON "ServiceRequest"("status")`);
  await run('SR category idx', `CREATE INDEX IF NOT EXISTS "ServiceRequest_category_idx" ON "ServiceRequest"("category")`);
  await run('SR createdAt idx', `CREATE INDEX IF NOT EXISTS "ServiceRequest_createdAt_idx" ON "ServiceRequest"("createdAt")`);
  await run('SR refNum idx', `CREATE INDEX IF NOT EXISTS "ServiceRequest_referenceNumber_idx" ON "ServiceRequest"("referenceNumber")`);

  // ── Indexes for Job ──
  await run('Job srId idx', `CREATE INDEX IF NOT EXISTS "Job_serviceRequestId_idx" ON "Job"("serviceRequestId")`);
  await run('Job vendorId idx', `CREATE INDEX IF NOT EXISTS "Job_vendorId_idx" ON "Job"("vendorId")`);
  await run('Job status idx', `CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status")`);

  return NextResponse.json({ success: true, results }, { status: 200 });
}
