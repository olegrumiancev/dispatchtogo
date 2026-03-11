ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "serviceCategories" JSONB,
ADD COLUMN IF NOT EXISTS "organizationTypes" JSONB;
