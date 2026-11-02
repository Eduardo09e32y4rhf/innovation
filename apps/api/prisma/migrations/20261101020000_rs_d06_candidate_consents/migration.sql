-- RS-D-06 / RS-C-18: livro de consentimentos do candidato com prova. Idempotente.
CREATE TABLE IF NOT EXISTS "CandidateConsent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "accountId" UUID,
  "applicationId" UUID,
  "companyId" UUID,
  "purpose" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "textHash" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedVia" TEXT,
  "tokenHash" TEXT NOT NULL,
  "receiptSentAt" TIMESTAMP(3),
  CONSTRAINT "CandidateConsent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateConsent_tokenHash_key" ON "CandidateConsent"("tokenHash");
CREATE INDEX IF NOT EXISTS "CandidateConsent_email_purpose_idx" ON "CandidateConsent"("email", "purpose");
CREATE INDEX IF NOT EXISTS "CandidateConsent_accountId_idx" ON "CandidateConsent"("accountId");
CREATE INDEX IF NOT EXISTS "CandidateConsent_applicationId_idx" ON "CandidateConsent"("applicationId");
