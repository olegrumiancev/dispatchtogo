ALTER TABLE "ServiceRequest"
ADD COLUMN IF NOT EXISTS "quotePolicy" TEXT NOT NULL DEFAULT 'VENDOR_DECIDES';

ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "quoteDisposition" TEXT,
ADD COLUMN IF NOT EXISTS "quoteDispositionAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "quoteDispositionNote" TEXT;

CREATE TABLE IF NOT EXISTS "Quote" (
  "id" TEXT NOT NULL,
  "serviceRequestId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "source" TEXT NOT NULL DEFAULT 'REMOTE',
  "supersedesQuoteId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "scopeSummary" TEXT NOT NULL,
  "assumptions" TEXT,
  "exclusions" TEXT,
  "validUntil" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "decidedByUserId" TEXT,
  "decisionNote" TEXT,
  "requestTitleSnapshot" TEXT,
  "propertyNameSnapshot" TEXT NOT NULL,
  "propertyAddressSnapshot" TEXT,
  "vendorNameSnapshot" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuoteRequestPhoto" (
  "quoteId" TEXT NOT NULL,
  "photoId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "QuoteRequestPhoto_pkey" PRIMARY KEY ("quoteId", "photoId")
);

CREATE TABLE IF NOT EXISTS "QuoteJobPhoto" (
  "quoteId" TEXT NOT NULL,
  "photoId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "QuoteJobPhoto_pkey" PRIMARY KEY ("quoteId", "photoId")
);

CREATE INDEX IF NOT EXISTS "Quote_serviceRequestId_vendorId_status_idx"
  ON "Quote"("serviceRequestId", "vendorId", "status");
CREATE INDEX IF NOT EXISTS "Quote_serviceRequestId_createdAt_idx"
  ON "Quote"("serviceRequestId", "createdAt");
CREATE INDEX IF NOT EXISTS "Quote_vendorId_createdAt_idx"
  ON "Quote"("vendorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Quote_supersedesQuoteId_idx"
  ON "Quote"("supersedesQuoteId");
CREATE INDEX IF NOT EXISTS "QuoteRequestPhoto_photoId_idx"
  ON "QuoteRequestPhoto"("photoId");
CREATE INDEX IF NOT EXISTS "QuoteJobPhoto_photoId_idx"
  ON "QuoteJobPhoto"("photoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Quote_serviceRequestId_fkey'
      AND table_name = 'Quote'
  ) THEN
    ALTER TABLE "Quote"
    ADD CONSTRAINT "Quote_serviceRequestId_fkey"
      FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Quote_vendorId_fkey'
      AND table_name = 'Quote'
  ) THEN
    ALTER TABLE "Quote"
    ADD CONSTRAINT "Quote_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'QuoteRequestPhoto_quoteId_fkey'
      AND table_name = 'QuoteRequestPhoto'
  ) THEN
    ALTER TABLE "QuoteRequestPhoto"
    ADD CONSTRAINT "QuoteRequestPhoto_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'QuoteRequestPhoto_photoId_fkey'
      AND table_name = 'QuoteRequestPhoto'
  ) THEN
    ALTER TABLE "QuoteRequestPhoto"
    ADD CONSTRAINT "QuoteRequestPhoto_photoId_fkey"
      FOREIGN KEY ("photoId") REFERENCES "Photo"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'QuoteJobPhoto_quoteId_fkey'
      AND table_name = 'QuoteJobPhoto'
  ) THEN
    ALTER TABLE "QuoteJobPhoto"
    ADD CONSTRAINT "QuoteJobPhoto_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'QuoteJobPhoto_photoId_fkey'
      AND table_name = 'QuoteJobPhoto'
  ) THEN
    ALTER TABLE "QuoteJobPhoto"
    ADD CONSTRAINT "QuoteJobPhoto_photoId_fkey"
      FOREIGN KEY ("photoId") REFERENCES "JobPhoto"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;
