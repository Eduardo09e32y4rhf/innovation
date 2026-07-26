CREATE TABLE "AiUsageLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "companyId" UUID,
    "actorId" UUID,
    "model" TEXT,
    "source" TEXT,
    "requestType" TEXT,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCost" DECIMAL(12,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageLog_tenantId_createdAt_idx" ON "AiUsageLog"("tenantId", "createdAt");
CREATE INDEX "AiUsageLog_companyId_createdAt_idx" ON "AiUsageLog"("companyId", "createdAt");
CREATE INDEX "AiUsageLog_actorId_idx" ON "AiUsageLog"("actorId");

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "GeneratedDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID,
    "userId" UUID,
    "createdByUserId" UUID,
    "documentType" TEXT NOT NULL,
    "sourceEntity" TEXT NOT NULL,
    "sourceEntityId" TEXT,
    "title" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "pdfBase64" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratedDocument_sha256_key" ON "GeneratedDocument"("sha256");
CREATE INDEX "GeneratedDocument_companyId_createdAt_idx" ON "GeneratedDocument"("companyId", "createdAt");
CREATE INDEX "GeneratedDocument_userId_createdAt_idx" ON "GeneratedDocument"("userId", "createdAt");
CREATE INDEX "GeneratedDocument_sourceEntity_sourceEntityId_idx" ON "GeneratedDocument"("sourceEntity", "sourceEntityId");

ALTER TABLE "GeneratedDocument"
  ADD CONSTRAINT "GeneratedDocument_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GeneratedDocument"
  ADD CONSTRAINT "GeneratedDocument_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GeneratedDocument"
  ADD CONSTRAINT "GeneratedDocument_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
