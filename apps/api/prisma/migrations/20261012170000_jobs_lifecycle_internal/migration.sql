-- Vaga encerrada continua 30 dias (reativavel) e processo interno por matricula.
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "reopenCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- Vagas que ja estavam encerradas: a contagem dos 30 dias parte da ultima alteracao.
UPDATE "Job" SET "closedAt" = "updatedAt" WHERE "status" = 'CLOSED' AND "closedAt" IS NULL;

ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "employeeId" UUID;
CREATE INDEX IF NOT EXISTS "Application_companyId_employeeId_idx" ON "Application"("companyId", "employeeId");
