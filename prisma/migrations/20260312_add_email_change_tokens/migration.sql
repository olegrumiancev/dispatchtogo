CREATE TABLE IF NOT EXISTS "EmailChangeToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailChangeToken_token_key" ON "EmailChangeToken"("token");
CREATE INDEX IF NOT EXISTS "EmailChangeToken_userId_idx" ON "EmailChangeToken"("userId");
CREATE INDEX IF NOT EXISTS "EmailChangeToken_newEmail_idx" ON "EmailChangeToken"("newEmail");
CREATE INDEX IF NOT EXISTS "EmailChangeToken_expiresAt_idx" ON "EmailChangeToken"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'EmailChangeToken_userId_fkey'
      AND table_name = 'EmailChangeToken'
  ) THEN
    ALTER TABLE "EmailChangeToken"
    ADD CONSTRAINT "EmailChangeToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
