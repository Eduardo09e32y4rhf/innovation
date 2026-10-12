-- Vagas: status aguardando aprovacao / pausada / preenchida, requisicao com aprovacao por etapa, orcamento por area, modelos e vaga confidencial
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'FILLED';

ALTER TABLE "Job" ADD COLUMN "confidential" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecruitmentSetting" ADD COLUMN "approvalSteps" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "JobApproval" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "step" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedBy" UUID,
    "decidedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobApproval_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JobApproval_jobId_step_key" ON "JobApproval"("jobId", "step");
CREATE INDEX "JobApproval_companyId_status_idx" ON "JobApproval"("companyId", "status");

CREATE TABLE "AreaHeadcount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "department" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AreaHeadcount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AreaHeadcount_companyId_department_key" ON "AreaHeadcount"("companyId", "department");

CREATE TABLE "JobTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JobTemplate_companyId_idx" ON "JobTemplate"("companyId");