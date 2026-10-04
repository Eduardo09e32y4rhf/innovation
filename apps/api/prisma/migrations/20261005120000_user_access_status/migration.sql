-- Status de acesso do usuario (bloqueado / cancelado) e indices do historico de atividade. Aditiva e idempotente.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
