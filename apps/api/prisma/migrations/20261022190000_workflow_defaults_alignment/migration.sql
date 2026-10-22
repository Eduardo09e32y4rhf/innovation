-- Prisma gera uuid() e @updatedAt no cliente. Não reescreve a migração anterior.
ALTER TABLE "RecruitmentWorkflowRun" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "RecruitmentWorkflowRun" ALTER COLUMN "updatedAt" DROP DEFAULT;
