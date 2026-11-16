-- Production hardening migration:
-- - User timezone, email verification timestamps, streak freeze, onboarding state
-- - Idempotent XpEvent ledger key (userId, source, refId)
-- - LessonProgress firstPassedAt & placedOutAt
-- - StripeEvent idempotency, RateLimitBucket, ProblemReveal, ContentReport
-- - ContactMessage & SyncEvent user relations + hot-path indexes

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "streakFreezes" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "freezeUsedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailVerifySentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "targetTrack" TEXT;

ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Session_createdAt_idx" ON "Session"("createdAt");

ALTER TABLE "XpEvent"
  ADD COLUMN IF NOT EXISTS "refId" TEXT NOT NULL DEFAULT '';

UPDATE "XpEvent" SET "refId" = "id" WHERE "refId" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "XpEvent_userId_source_refId_key" ON "XpEvent"("userId", "source", "refId");

ALTER TABLE "LessonProgress"
  ADD COLUMN IF NOT EXISTS "firstPassedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "placedOutAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AssessmentAttempt_userId_submittedAt_idx" ON "AssessmentAttempt"("userId", "submittedAt");
CREATE INDEX IF NOT EXISTS "ProblemAttempt_userId_problemSlug_status_idx" ON "ProblemAttempt"("userId", "problemSlug", "status");
CREATE INDEX IF NOT EXISTS "SyncEvent_appliedAt_idx" ON "SyncEvent"("appliedAt");

ALTER TABLE "ContactMessage"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "StripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "tokens" DOUBLE PRECISION NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "ProblemReveal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "problemSlug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProblemReveal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProblemReveal_userId_problemSlug_key" ON "ProblemReveal"("userId", "problemSlug");

ALTER TABLE "ProblemReveal"
  DROP CONSTRAINT IF EXISTS "ProblemReveal_userId_fkey",
  ADD CONSTRAINT "ProblemReveal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ContentReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "lessonId" TEXT,
  "problemSlug" TEXT,
  "cardIndex" INTEGER,
  "reason" TEXT NOT NULL,
  "comment" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");

ALTER TABLE "ContentReport"
  DROP CONSTRAINT IF EXISTS "ContentReport_userId_fkey",
  ADD CONSTRAINT "ContentReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
