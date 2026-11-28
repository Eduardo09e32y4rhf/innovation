CREATE TABLE IF NOT EXISTS "CandidatePortalAssessment" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "bankVersion" INTEGER NOT NULL DEFAULT 1,
  "questions" JSONB NOT NULL,
  "answers" JSONB NOT NULL,
  "essay" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER,
  "shareConsent" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidatePortalAssessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CandidatePortalAssessment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CandidatePortalAssessment_kind_check" CHECK ("kind" IN ('PORTUGUESE', 'MATH', 'ESSAY', 'CULTURE', 'WORK_STYLE')),
  CONSTRAINT "CandidatePortalAssessment_status_check" CHECK ("status" IN ('IN_PROGRESS', 'COMPLETED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "CandidatePortalAssessment_accountId_kind_key" ON "CandidatePortalAssessment"("accountId", "kind");
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "portalAccountId" UUID;
ALTER TABLE "Application" ADD CONSTRAINT "Application_portalAccountId_fkey" FOREIGN KEY ("portalAccountId") REFERENCES "CandidateAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
