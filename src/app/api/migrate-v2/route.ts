import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ONE-TIME migration v2 - fix remaining column mismatches
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== "dtg-migrate-v2-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  const run = async (label: string, sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`OK: ${label}`);
    } catch (e: any) {
      results.push(`SKIP ${label}: ${e.message}`);
    }
  };

  // Organization: add missing columns
  await run('Org.phone', `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "phone" TEXT`);
  await run('Org.email', `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "email" TEXT`);

  // Vendor: add missing columns
  await run('Vendor.serviceArea', `ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "serviceArea" TEXT`);
  await run('Vendor.specialties', `ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "specialties" TEXT[] DEFAULT '{}'`);

  // Add missing tables that Prisma schema expects
  // AuditLog (schema has it, DB has AiAuditLog instead)
  await run('Create AuditLog table', `
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "userId" TEXT,
      "metadata" JSONB NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    )
  `);
  await run('AuditLog userId FK', `
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
  `);
  await run('AuditLog entityType_entityId idx', `CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId")`);
  await run('AuditLog userId idx', `CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")`);
  await run('AuditLog createdAt idx', `CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")`);

  // ChatMessage
  await run('Create ChatMessage table', `
    CREATE TABLE IF NOT EXISTS "ChatMessage" (
      "id" TEXT NOT NULL,
      "requestId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
    )
  `);
  await run('ChatMessage requestId FK', `
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_requestId_fkey" 
    FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  `);
  await run('ChatMessage userId FK', `
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  `);
  await run('ChatMessage requestId idx', `CREATE INDEX IF NOT EXISTS "ChatMessage_requestId_idx" ON "ChatMessage"("requestId")`);

  // Notification
  await run('Create Notification table', `
    CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "read" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
    )
  `);
  await run('Notification userId FK', `
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  `);
  await run('Notification userId idx', `CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId")`);
  await run('Notification read idx', `CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read")`);

  // AiClassification
  await run('Create AiClassification table', `
    CREATE TABLE IF NOT EXISTS "AiClassification" (
      "id" TEXT NOT NULL,
      "requestId" TEXT NOT NULL,
      "suggestedCategory" TEXT NOT NULL,
      "confidence" DOUBLE PRECISION NOT NULL,
      "reasoning" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AiClassification_pkey" PRIMARY KEY ("id")
    )
  `);
  await run('AiClassification requestId FK', `
    ALTER TABLE "AiClassification" ADD CONSTRAINT "AiClassification_requestId_fkey" 
    FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  `);
  await run('AiClassification requestId idx', `CREATE INDEX IF NOT EXISTS "AiClassification_requestId_idx" ON "AiClassification"("requestId")`);

  // JobPhoto (DB may have Photo but not JobPhoto)
  await run('Create JobPhoto table', `
    CREATE TABLE IF NOT EXISTS "JobPhoto" (
      "id" TEXT NOT NULL,
      "jobId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "caption" TEXT,
      "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
    )
  `);
  await run('JobPhoto jobId FK', `
    ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" 
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  `);
  await run('JobPhoto jobId idx', `CREATE INDEX IF NOT EXISTS "JobPhoto_jobId_idx" ON "JobPhoto"("jobId")`);

  // Fix Organization.type default from 'OTHER' to 'OPERATOR'
  // First check if 'OTHER' is in the enum and if we need 'OPERATOR'
  await run('Add OPERATOR to OrganizationType enum', `
    ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'OPERATOR'
  `);
  await run('Add VENDOR to OrganizationType enum', `
    ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'VENDOR'
  `);
  await run('Change Org.type default', `
    ALTER TABLE "Organization" ALTER COLUMN "type" SET DEFAULT 'OPERATOR'::"OrganizationType"
  `);

  // Make Organization.contactEmail nullable (Prisma schema says optional)
  await run('Org.contactEmail nullable', `ALTER TABLE "Organization" ALTER COLUMN "contactEmail" DROP NOT NULL`);

  // ServiceRequest.title column might be missing
  await run('SR.title', `ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT ''`);

  return NextResponse.json({ success: true, results }, { status: 200 });
}
