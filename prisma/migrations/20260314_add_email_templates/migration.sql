ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "emailTemplates" JSONB NOT NULL DEFAULT '{}'::jsonb;