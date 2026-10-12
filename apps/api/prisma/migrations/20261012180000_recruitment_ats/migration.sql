-- Recrutamento: LGPD (versao do consentimento, retencao, anonimizacao, pedidos do titular, diversidade separada), portal do candidato e motivo padronizado
ALTER TABLE "Application" ADD COLUMN "consentVersion" TEXT,
  ADD COLUMN "trackingToken" TEXT,
  ADD COLUMN "rejectionCode" TEXT,
  ADD COLUMN "retentionUntil" TIMESTAMP(3),
  ADD COLUMN "anonymizedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Application_trackingToken_key" ON "Application"("trackingToken");
CREATE INDEX "Application_retentionUntil_idx" ON "Application"("retentionUntil");

CREATE TABLE "RecruitmentSetting" (
    "companyId" UUID NOT NULL,
    "retentionMonths" INTEGER NOT NULL DEFAULT 12,
    "receiptEmail" BOOLEAN NOT NULL DEFAULT true,
    "rejectionEmail" BOOLEAN NOT NULL DEFAULT true,
    "rejectionMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecruitmentSetting_pkey" PRIMARY KEY ("companyId")
);

CREATE TABLE "CandidateDiversity" (
    "applicationId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "gender" TEXT,
    "race" TEXT,
    "pcd" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateDiversity_pkey" PRIMARY KEY ("applicationId")
);
CREATE INDEX "CandidateDiversity_companyId_idx" ON "CandidateDiversity"("companyId");

CREATE TABLE "CandidateRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" UUID,
    CONSTRAINT "CandidateRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CandidateRequest_companyId_status_idx" ON "CandidateRequest"("companyId", "status");