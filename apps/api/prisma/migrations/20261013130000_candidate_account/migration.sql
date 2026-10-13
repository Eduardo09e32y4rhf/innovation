-- Area do candidato: conta com perfil minimo (LGPD), login por codigo no e-mail e sessoes
CREATE TABLE "CandidateAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "cpf" TEXT,
    "phone" TEXT,
    "cep" TEXT,
    "street" TEXT,
    "streetNumber" TEXT,
    "addressComplement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "education" JSONB,
    "resumeKey" TEXT,
    "resumeName" TEXT,
    "resumeType" TEXT,
    "resumeSize" INTEGER,
    "consentAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "admissionShareConsent" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CandidateAccount_email_key" ON "CandidateAccount"("email");

CREATE TABLE "CandidateLoginCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateLoginCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CandidateLoginCode_email_createdAt_idx" ON "CandidateLoginCode"("email", "createdAt");

CREATE TABLE "CandidateSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CandidateSession_tokenHash_key" ON "CandidateSession"("tokenHash");
CREATE INDEX "CandidateSession_accountId_idx" ON "CandidateSession"("accountId");
ALTER TABLE "CandidateSession" ADD CONSTRAINT "CandidateSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
