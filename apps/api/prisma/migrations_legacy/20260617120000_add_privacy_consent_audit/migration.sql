-- LGPD consent and audit trail foundation.
CREATE TABLE "PrivacyConsent" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "termVersion" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PrivacyConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrivacyConsent_userId_termVersion_key" ON "PrivacyConsent"("userId", "termVersion");
CREATE INDEX "PrivacyConsent_companyId_idx" ON "PrivacyConsent"("companyId");
CREATE INDEX "PrivacyConsent_userId_idx" ON "PrivacyConsent"("userId");
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");
CREATE INDEX "AuditLog_companyId_entity_idx" ON "AuditLog"("companyId", "entity");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

ALTER TABLE "PrivacyConsent" ADD CONSTRAINT "PrivacyConsent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyConsent" ADD CONSTRAINT "PrivacyConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
