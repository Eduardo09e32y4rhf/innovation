ALTER TABLE "PipelineStage"
  ADD COLUMN "automation" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "automationConfig" JSONB,
  ADD COLUMN "notifyCandidate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "candidateLabel" TEXT;

UPDATE "PipelineStage" SET
  "automation" = CASE
    WHEN lower("name") LIKE '%question%' THEN 'SEND_BEHAVIORAL_ASSESSMENT'
    WHEN lower("name") LIKE '%teste%' THEN 'SEND_TECHNICAL_ASSESSMENT'
    WHEN "kind" = 'INTERVIEW' THEN 'SCHEDULE_INTERVIEW'
    WHEN lower("name") LIKE '%document%' THEN 'REQUEST_DOCUMENTS'
    WHEN lower("name") LIKE '%admiss%' THEN 'COMPLETE_ADMISSION'
    WHEN "kind" = 'OFFER' THEN 'PREPARE_OFFER'
    ELSE "automation" END,
  "candidateLabel" = COALESCE("candidateLabel", "name");

UPDATE "PipelineStage" s SET "position" = s."position" * 10
WHERE EXISTS (SELECT 1 FROM "HiringPipeline" p WHERE p."id" = s."pipelineId" AND p."isDefault" = true);

INSERT INTO "PipelineStage" ("id", "pipelineId", "name", "color", "position", "kind", "automation", "notifyCandidate", "candidateLabel")
SELECT gen_random_uuid(), p."id", v."name", v."color", v."position", v."kind"::"ApplicationStatus", v."automation", v."notifyCandidate", v."candidateLabel"
FROM "HiringPipeline" p CROSS JOIN (VALUES
  ('Questionário', '#14b8a6', 15, 'SCREENING', 'SEND_BEHAVIORAL_ASSESSMENT', false, 'Questionário comportamental'),
  ('Teste técnico', '#0891b2', 16, 'SCREENING', 'SEND_TECHNICAL_ASSESSMENT', false, 'Teste técnico'),
  ('Documentação', '#7c3aed', 35, 'OFFER', 'REQUEST_DOCUMENTS', false, 'Documentos admissionais'),
  ('Admissão', '#4f46e5', 36, 'OFFER', 'COMPLETE_ADMISSION', true, 'Admissão em andamento')
) AS v("name", "color", "position", "kind", "automation", "notifyCandidate", "candidateLabel")
WHERE p."isDefault" = true AND NOT EXISTS (
  SELECT 1 FROM "PipelineStage" s WHERE s."pipelineId" = p."id" AND s."automation" = v."automation"
);

CREATE TABLE "RecruitmentWorkflowRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "companyId" UUID NOT NULL,
  "applicationId" UUID NOT NULL, "stageId" UUID NOT NULL, "action" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "result" JSONB, "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruitmentWorkflowRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecruitmentWorkflowRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecruitmentWorkflowRun_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecruitmentWorkflowRun_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RecruitmentWorkflowRun_idempotencyKey_key" ON "RecruitmentWorkflowRun"("idempotencyKey");
CREATE INDEX "RecruitmentWorkflowRun_companyId_status_createdAt_idx" ON "RecruitmentWorkflowRun"("companyId", "status", "createdAt");
CREATE INDEX "RecruitmentWorkflowRun_applicationId_createdAt_idx" ON "RecruitmentWorkflowRun"("applicationId", "createdAt");
