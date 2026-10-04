-- Fase 1: verificacao de e-mail, bloqueio progressivo, MFA (TOTP) e sessoes com refresh token rotativo. Aditiva e idempotente.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecretEnc" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaRecoveryHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "RefreshSession" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "family" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedBy" UUID,
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshSession_userId_revokedAt_idx" ON "RefreshSession"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "RefreshSession_family_idx" ON "RefreshSession"("family");
CREATE INDEX IF NOT EXISTS "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");