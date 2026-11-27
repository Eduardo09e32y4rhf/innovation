ALTER TABLE "JobCriterion"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'SKILL',
  ADD COLUMN "value" TEXT,
  ADD COLUMN "isMandatory" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "CandidateAccount"
  ALTER COLUMN "driverLicenseCategory" TYPE TEXT[]
    USING CASE
      WHEN "driverLicenseCategory" IS NULL OR BTRIM("driverLicenseCategory") = '' THEN ARRAY[]::TEXT[]
      ELSE ARRAY[UPPER(BTRIM("driverLicenseCategory"))]::TEXT[]
    END,
  ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 350;

CREATE TABLE "CandidateSavedJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "accountId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateSavedJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CandidateSavedJob_accountId_jobId_key" ON "CandidateSavedJob"("accountId", "jobId");
CREATE INDEX "CandidateSavedJob_jobId_idx" ON "CandidateSavedJob"("jobId");
ALTER TABLE "CandidateSavedJob" ADD CONSTRAINT "CandidateSavedJob_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateSavedJob" ADD CONSTRAINT "CandidateSavedJob_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CandidateMissionLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "accountId" UUID NOT NULL,
  "missionKey" TEXT NOT NULL,
  "xpEarned" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateMissionLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CandidateMissionLog_accountId_missionKey_key" ON "CandidateMissionLog"("accountId", "missionKey");
CREATE INDEX "CandidateMissionLog_accountId_completedAt_idx" ON "CandidateMissionLog"("accountId", "completedAt");
ALTER TABLE "CandidateMissionLog" ADD CONSTRAINT "CandidateMissionLog_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove only exact copies of the professional summary in fields that have distinct meanings.
UPDATE "CandidateAccount"
SET "profession" = NULL
WHERE "about" IS NOT NULL AND "profession" IS NOT NULL
  AND LOWER(REGEXP_REPLACE(BTRIM("profession"), '\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(BTRIM("about"), '\s+', ' ', 'g'));

UPDATE "CandidateAccount" AS account
SET "education" = (
  SELECT JSONB_AGG(
    CASE
      WHEN LOWER(REGEXP_REPLACE(BTRIM(COALESCE(source.item->>'course', '')), '\s+', ' ', 'g')) =
           LOWER(REGEXP_REPLACE(BTRIM(COALESCE(account."about", '')), '\s+', ' ', 'g'))
        AND COALESCE(account."about", '') <> ''
      THEN JSONB_SET(source.item, '{course}', '""'::jsonb, TRUE)
      ELSE source.item
    END ORDER BY source.ordinal
  )
  FROM JSONB_ARRAY_ELEMENTS(account."education"::jsonb) WITH ORDINALITY AS source(item, ordinal)
)
WHERE JSONB_TYPEOF(account."education"::jsonb) = 'array'
  AND EXISTS (
    SELECT 1 FROM JSONB_ARRAY_ELEMENTS(account."education"::jsonb) AS source(item)
    WHERE LOWER(REGEXP_REPLACE(BTRIM(COALESCE(source.item->>'course', '')), '\s+', ' ', 'g')) =
          LOWER(REGEXP_REPLACE(BTRIM(COALESCE(account."about", '')), '\s+', ' ', 'g'))
      AND COALESCE(account."about", '') <> ''
  );
