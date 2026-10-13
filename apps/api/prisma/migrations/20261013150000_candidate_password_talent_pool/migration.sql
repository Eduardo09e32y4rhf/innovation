-- Candidato: senha, perfil profissional, banco de talentos e convites.
ALTER TABLE "CandidateAccount"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3),
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "birthDate" DATE,
  ADD COLUMN "profession" TEXT,
  ADD COLUMN "skills" JSONB,
  ADD COLUMN "hasDriverLicense" BOOLEAN,
  ADD COLUMN "driverLicenseCategory" TEXT,
  ADD COLUMN "talentPoolConsentAt" TIMESTAMP(3);

CREATE INDEX "CandidateAccount_talentPoolConsentAt_city_idx" ON "CandidateAccount"("talentPoolConsentAt", "city");

ALTER TABLE "CandidateLoginCode" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'RESET';

CREATE TABLE "CandidateInvite" (
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
CREATE UNIQUE INDEX "CandidateInvite_accountId_jobId_key" ON "CandidateInvite"("accountId", "jobId");
CREATE INDEX "CandidateInvite_companyId_createdAt_idx" ON "CandidateInvite"("companyId", "createdAt");
ALTER TABLE "CandidateInvite" ADD CONSTRAINT "CandidateInvite_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CandidateProfileView" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "userId" UUID,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateProfileView_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CandidateProfileView_accountId_createdAt_idx" ON "CandidateProfileView"("accountId", "createdAt");
CREATE INDEX "CandidateProfileView_companyId_createdAt_idx" ON "CandidateProfileView"("companyId", "createdAt");
ALTER TABLE "CandidateProfileView" ADD CONSTRAINT "CandidateProfileView_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
