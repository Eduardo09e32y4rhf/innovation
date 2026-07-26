ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'ONBOARDING';

DO $$
BEGIN
  CREATE TYPE "AsoResult" AS ENUM ('APTO', 'INAPTO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "originCandidateId" UUID;

ALTER TABLE "employee_aso_records"
  ADD COLUMN IF NOT EXISTS "result" "AsoResult";

ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "resumeName" TEXT,
  ADD COLUMN IF NOT EXISTS "resumeType" TEXT,
  ADD COLUMN IF NOT EXISTS "resumeSize" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "Employee_originCandidateId_key"
  ON "Employee"("originCandidateId");

DO $$
BEGIN
  ALTER TABLE "Employee"
    ADD CONSTRAINT "Employee_originCandidateId_fkey"
    FOREIGN KEY ("originCandidateId") REFERENCES "Candidate"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
