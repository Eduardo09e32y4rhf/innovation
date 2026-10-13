-- Candidato: senha, perfil profissional, banco de talentos e convites.
-- Idempotente: pode rodar de novo em producao sem erro.
ALTER TABLE "CandidateAccount"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "birthDate" DATE,
  ADD COLUMN IF NOT EXISTS "profession" TEXT,
  ADD COLUMN IF NOT EXISTS "skills" JSONB,
  ADD COLUMN IF NOT EXISTS "hasDriverLicense" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "driverLicenseCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "talentPoolConsentAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CandidateAccount_talentPoolConsentAt_city_idx" ON "CandidateAccount"("talentPoolConsentAt", "city");

ALTER TABLE "CandidateLoginCode" ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'RESET';

CREATE TABLE IF NOT EXISTS "CandidateInvite" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "invitedBy" UUID,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateInvite_accountId_jobId_key" ON "CandidateInvite"("accountId", "jobId");
CREATE INDEX IF NOT EXISTS "CandidateInvite_companyId_createdAt_idx" ON "CandidateInvite"("companyId", "createdAt");

CREATE TABLE IF NOT EXISTS "CandidateProfileView" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "userId" UUID,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateProfileView_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CandidateProfileView_accountId_createdAt_idx" ON "CandidateProfileView"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "CandidateProfileView_companyId_createdAt_idx" ON "CandidateProfileView"("companyId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateInvite_accountId_fkey') THEN
    ALTER TABLE "CandidateInvite" ADD CONSTRAINT "CandidateInvite_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateProfileView_accountId_fkey') THEN
    ALTER TABLE "CandidateProfileView" ADD CONSTRAINT "CandidateProfileView_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
