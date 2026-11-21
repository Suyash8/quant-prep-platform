-- Add missing foreign key constraints declared in schema.prisma and index User.subscriptionId
-- Uses idempotent guards so re-running against partially migrated DBs is safe.

CREATE INDEX IF NOT EXISTS "User_subscriptionId_idx" ON "User"("subscriptionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ContactMessage_userId_fkey'
  ) THEN
    ALTER TABLE "ContactMessage"
      ADD CONSTRAINT "ContactMessage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SyncEvent_userId_fkey'
  ) THEN
    ALTER TABLE "SyncEvent"
      ADD CONSTRAINT "SyncEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
