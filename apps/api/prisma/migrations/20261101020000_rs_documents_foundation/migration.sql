-- RS pacote C (documentos): versao de modelos, assinatura simples, requiredDocuments, tipos/validade/sensivel, codigo de upload, lembretes. Idempotente.
ALTER TABLE "DocumentTemplate" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DocumentTemplate" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;

CREATE TABLE IF NOT EXISTS "DocumentTemplateVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentTemplateVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentTemplateVersion_templateId_version_key" ON "DocumentTemplateVersion"("templateId", "version");
CREATE INDEX IF NOT EXISTS "DocumentTemplateVersion_companyId_idx" ON "DocumentTemplateVersion"("companyId");
DO $$ BEGIN
  ALTER TABLE "DocumentTemplateVersion" ADD CONSTRAINT "DocumentTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SignedDocument" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "applicationId" UUID,
  "kind" TEXT NOT NULL,
  "templateId" UUID,
  "templateVersion" INTEGER,
  "text" TEXT NOT NULL,
  "textHash" TEXT NOT NULL,
  "pdfKey" TEXT NOT NULL,
  "pdfSha256" TEXT NOT NULL,
  "signerName" TEXT NOT NULL,
  "signerEmail" TEXT,
  "signerDocument" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignedDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SignedDocument_companyId_applicationId_idx" ON "SignedDocument"("companyId", "applicationId");
CREATE INDEX IF NOT EXISTS "SignedDocument_companyId_kind_idx" ON "SignedDocument"("companyId", "kind");

CREATE TABLE IF NOT EXISTS "RecruitmentAdmissionForm" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "dependents" JSONB,
  "transport" JSONB,
  "meal" JSONB,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecruitmentAdmissionForm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RecruitmentAdmissionForm_applicationId_key" ON "RecruitmentAdmissionForm"("applicationId");
CREATE INDEX IF NOT EXISTS "RecruitmentAdmissionForm_companyId_idx" ON "RecruitmentAdmissionForm"("companyId");

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "requiredDocuments" JSONB;

ALTER TABLE "RecruitmentDocumentRequest" ADD COLUMN IF NOT EXISTS "reissuedFromId" UUID;
ALTER TABLE "RecruitmentDocumentRequest" ADD COLUMN IF NOT EXISTS "reminderD3At" TIMESTAMP(3);
ALTER TABLE "RecruitmentDocumentRequest" ADD COLUMN IF NOT EXISTS "reminderD1At" TIMESTAMP(3);
ALTER TABLE "RecruitmentDocumentRequest" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "RecruitmentDocumentRequest" ADD COLUMN IF NOT EXISTS "codeHash" TEXT;
ALTER TABLE "RecruitmentDocumentRequest" ADD COLUMN IF NOT EXISTS "codeExpiresAt" TIMESTAMP(3);
ALTER TABLE "RecruitmentDocumentRequest" ADD COLUMN IF NOT EXISTS "codeAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RecruitmentDocumentRequest" ADD COLUMN IF NOT EXISTS "codeSentAt" TIMESTAMP(3);

ALTER TABLE "RecruitmentDocument" ADD COLUMN IF NOT EXISTS "docType" TEXT;
ALTER TABLE "RecruitmentDocument" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "RecruitmentDocument" ADD COLUMN IF NOT EXISTS "expiryAlertedAt" TIMESTAMP(3);
ALTER TABLE "RecruitmentDocument" ADD COLUMN IF NOT EXISTS "sensitive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecruitmentDocument" ADD COLUMN IF NOT EXISTS "legalBasis" TEXT;
ALTER TABLE "RecruitmentDocument" ADD COLUMN IF NOT EXISTS "encrypted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PrivacyConsent" ADD COLUMN IF NOT EXISTS "photoKey" TEXT;
ALTER TABLE "PrivacyConsent" ADD COLUMN IF NOT EXISTS "pdfKey" TEXT;
