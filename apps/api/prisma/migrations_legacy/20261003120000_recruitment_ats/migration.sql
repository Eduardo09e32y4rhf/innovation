-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "openings" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pipelineId" UUID,
ADD COLUMN     "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "salaryHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salaryMax" INTEGER,
ADD COLUMN     "salaryMin" INTEGER,
ADD COLUMN     "seniority" TEXT,
ADD COLUMN     "workMode" TEXT;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "knockedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "knockoutReason" TEXT,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "stageId" UUID,
ADD COLUMN     "stageMovedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "HiringPipeline" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" UUID NOT NULL,
    "pipelineId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "position" INTEGER NOT NULL DEFAULT 0,
    "kind" "ApplicationStatus" NOT NULL DEFAULT 'SCREENING',

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobQuestion" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "knockout" JSONB,
    "scoreRule" JSONB,

    CONSTRAINT "JobQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCriterion" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAnswer" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvaluation" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentTag" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',

    CONSTRAINT "RecruitmentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationTag" (
    "applicationId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ApplicationTag_pkey" PRIMARY KEY ("applicationId","tagId")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationNote" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationInterview" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'ENTREVISTA',
    "location" TEXT,
    "interviewer" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentSavedView" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitmentSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HiringPipeline_companyId_idx" ON "HiringPipeline"("companyId");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_position_idx" ON "PipelineStage"("pipelineId", "position");

-- CreateIndex
CREATE INDEX "JobQuestion_jobId_position_idx" ON "JobQuestion"("jobId", "position");

-- CreateIndex
CREATE INDEX "JobCriterion_jobId_position_idx" ON "JobCriterion"("jobId", "position");

-- CreateIndex
CREATE INDEX "ApplicationAnswer_questionId_idx" ON "ApplicationAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAnswer_applicationId_questionId_key" ON "ApplicationAnswer"("applicationId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationEvaluation_applicationId_criterionId_userId_key" ON "ApplicationEvaluation"("applicationId", "criterionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentTag_companyId_name_key" ON "RecruitmentTag"("companyId", "name");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_createdAt_idx" ON "ApplicationEvent"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationNote_applicationId_createdAt_idx" ON "ApplicationNote"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationInterview_applicationId_scheduledAt_idx" ON "ApplicationInterview"("applicationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "RecruitmentSavedView_companyId_userId_idx" ON "RecruitmentSavedView"("companyId", "userId");

-- CreateIndex
CREATE INDEX "Job_companyId_status_idx" ON "Job"("companyId", "status");

-- CreateIndex
CREATE INDEX "Application_companyId_jobId_stageId_idx" ON "Application"("companyId", "jobId", "stageId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "HiringPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringPipeline" ADD CONSTRAINT "HiringPipeline_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "HiringPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobQuestion" ADD CONSTRAINT "JobQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCriterion" ADD CONSTRAINT "JobCriterion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "JobQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "JobCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentTag" ADD CONSTRAINT "RecruitmentTag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTag" ADD CONSTRAINT "ApplicationTag_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTag" ADD CONSTRAINT "ApplicationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "RecruitmentTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationInterview" ADD CONSTRAINT "ApplicationInterview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentSavedView" ADD CONSTRAINT "RecruitmentSavedView_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
