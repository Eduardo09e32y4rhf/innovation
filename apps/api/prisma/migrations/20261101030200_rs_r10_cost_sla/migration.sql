-- RS-R-10: custo por vaga/origem (custo por contratacao) e SLA por etapa do funil.
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "costAmount" DECIMAL(12,2);
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "slaDays" INTEGER;

CREATE TABLE IF NOT EXISTS "JobSourceCost" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobSourceCost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobSourceCost_jobId_source_key" ON "JobSourceCost"("jobId", "source");
CREATE INDEX IF NOT EXISTS "JobSourceCost_companyId_idx" ON "JobSourceCost"("companyId");

DO $$ BEGIN
  ALTER TABLE "JobSourceCost" ADD CONSTRAINT "JobSourceCost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
