-- Log global de auditoria da plataforma (append-only, encadeado por hash). Aditiva e idempotente.
CREATE TABLE IF NOT EXISTS "PlatformAuditLog" (
  "id" UUID NOT NULL,
  "seq" BIGSERIAL NOT NULL,
  "actorId" UUID,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "companyId" UUID,
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "prevHash" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformAuditLog_seq_key" ON "PlatformAuditLog"("seq");
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_entity_entityId_idx" ON "PlatformAuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_actorId_idx" ON "PlatformAuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_companyId_idx" ON "PlatformAuditLog"("companyId");
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_action_idx" ON "PlatformAuditLog"("action");
