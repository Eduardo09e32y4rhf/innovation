-- RS-C-16: tokens do candidato (acompanhamento e entrevista) passam a ser guardados so como hash SHA-256, com expiracao.
-- Idempotente. Os valores brutos existentes sao convertidos em hash (os links ja enviados continuam funcionando) e apagados.
ALTER TABLE "RecruitmentSetting" ADD COLUMN IF NOT EXISTS "trackingTokenDays" INTEGER NOT NULL DEFAULT 90;

CREATE TABLE IF NOT EXISTS "RecruitmentAccessToken" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "applicationId" UUID NOT NULL,
  "interviewId" UUID,
  "kind" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruitmentAccessToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RecruitmentAccessToken_tokenHash_key" ON "RecruitmentAccessToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RecruitmentAccessToken_applicationId_kind_idx" ON "RecruitmentAccessToken"("applicationId", "kind");
CREATE INDEX IF NOT EXISTS "RecruitmentAccessToken_interviewId_idx" ON "RecruitmentAccessToken"("interviewId");
CREATE INDEX IF NOT EXISTS "RecruitmentAccessToken_expiresAt_idx" ON "RecruitmentAccessToken"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "RecruitmentAccessToken" ADD CONSTRAINT "RecruitmentAccessToken_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "RecruitmentAccessToken" ADD CONSTRAINT "RecruitmentAccessToken_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "ApplicationInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Acompanhamento: expira 90 dias apos a migracao.
INSERT INTO "RecruitmentAccessToken" ("applicationId", "kind", "tokenHash", "expiresAt")
SELECT a."id", 'TRACKING', encode(sha256(convert_to(a."trackingToken", 'UTF8')), 'hex'), NOW() + INTERVAL '90 days'
FROM "Application" a WHERE a."trackingToken" IS NOT NULL
ON CONFLICT ("tokenHash") DO NOTHING;
UPDATE "Application" SET "trackingToken" = NULL WHERE "trackingToken" IS NOT NULL;

-- Entrevista: vale ate 24 h depois do horario marcado.
INSERT INTO "RecruitmentAccessToken" ("applicationId", "interviewId", "kind", "tokenHash", "expiresAt")
SELECT i."applicationId", i."id", 'INTERVIEW', encode(sha256(convert_to(i."responseToken", 'UTF8')), 'hex'), i."scheduledAt" + INTERVAL '24 hours'
FROM "ApplicationInterview" i WHERE i."responseToken" IS NOT NULL
ON CONFLICT ("tokenHash") DO NOTHING;
UPDATE "ApplicationInterview" SET "responseToken" = NULL WHERE "responseToken" IS NOT NULL;
