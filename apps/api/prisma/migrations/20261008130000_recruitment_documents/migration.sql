-- Coleta de documentos do candidato (link temporario, scan, conferencia) e encaminhamento ao RH da empresa
CREATE TYPE "RecruitmentDocumentStatus" AS ENUM ('RECEIVED', 'APPROVED', 'RETURNED');

ALTER TABLE "Application" ADD COLUMN "selectedAt" TIMESTAMP(3),
  ADD COLUMN "selectedById" UUID,
  ADD COLUMN "forwardedAt" TIMESTAMP(3),
  ADD COLUMN "forwardedById" UUID;

CREATE TABLE "RecruitmentDocumentRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "items" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecruitmentDocumentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecruitmentDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "status" "RecruitmentDocumentStatus" NOT NULL DEFAULT 'RECEIVED',
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "returnReason" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecruitmentDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecruitmentDocumentRequest_tokenHash_key" ON "RecruitmentDocumentRequest"("tokenHash");
CREATE INDEX "RecruitmentDocumentRequest_companyId_applicationId_idx" ON "RecruitmentDocumentRequest"("companyId", "applicationId");
CREATE INDEX "RecruitmentDocument_companyId_applicationId_idx" ON "RecruitmentDocument"("companyId", "applicationId");
CREATE INDEX "RecruitmentDocument_requestId_idx" ON "RecruitmentDocument"("requestId");

ALTER TABLE "RecruitmentDocumentRequest" ADD CONSTRAINT "RecruitmentDocumentRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruitmentDocument" ADD CONSTRAINT "RecruitmentDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruitmentDocument" ADD CONSTRAINT "RecruitmentDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RecruitmentDocumentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;