-- Vagas de ponta a ponta: confirmacao de presenca e lembrete, autoagendamento, proposta, testes e avaliacao por entrevistador.

ALTER TABLE "ApplicationInterview"
  ADD COLUMN IF NOT EXISTS "responseToken" TEXT,
  ADD COLUMN IF NOT EXISTS "candidateResponse" TEXT,
  ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "declineReason" TEXT,
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationInterview_responseToken_key" ON "ApplicationInterview"("responseToken");

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "interviewGuide" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "InterviewFeedback" (
  "id" UUID NOT NULL,
  "interviewId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "authorName" TEXT,
  "ratings" JSONB NOT NULL DEFAULT '[]',
  "recommendation" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "InterviewFeedback_interviewId_userId_key" ON "InterviewFeedback"("interviewId", "userId");
CREATE INDEX IF NOT EXISTS "InterviewFeedback_applicationId_idx" ON "InterviewFeedback"("applicationId");
DO $$ BEGIN
  ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "ApplicationInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "InterviewSlotOffer" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "token" TEXT NOT NULL,
  "slots" JSONB NOT NULL,
  "mode" TEXT NOT NULL,
  "location" TEXT,
  "meetingUrl" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "interviewerRole" TEXT,
  "interviewer" TEXT,
  "candidateMessage" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "bookedAt" TIMESTAMP(3),
  "interviewId" UUID,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewSlotOffer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "InterviewSlotOffer_token_key" ON "InterviewSlotOffer"("token");
CREATE INDEX IF NOT EXISTS "InterviewSlotOffer_companyId_applicationId_idx" ON "InterviewSlotOffer"("companyId", "applicationId");

CREATE TABLE IF NOT EXISTS "JobOffer" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "token" TEXT NOT NULL,
  "positionTitle" TEXT NOT NULL,
  "contractType" TEXT NOT NULL,
  "salary" DECIMAL(12,2),
  "startDate" TIMESTAMP(3),
  "workSchedule" TEXT,
  "workMode" TEXT,
  "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "expiresAt" TIMESTAMP(3),
  "createdById" UUID,
  "createdByName" TEXT,
  "approvedById" UUID,
  "approvedByName" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectionNote" TEXT,
  "sentAt" TIMESTAMP(3),
  "viewedAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "declineReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobOffer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JobOffer_token_key" ON "JobOffer"("token");
CREATE INDEX IF NOT EXISTS "JobOffer_companyId_applicationId_idx" ON "JobOffer"("companyId", "applicationId");
CREATE INDEX IF NOT EXISTS "JobOffer_companyId_status_idx" ON "JobOffer"("companyId", "status");

CREATE TABLE IF NOT EXISTS "JobAssessment" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "timeLimitMinutes" INTEGER,
  "passingScore" INTEGER NOT NULL DEFAULT 60,
  "autoReject" BOOLEAN NOT NULL DEFAULT false,
  "questions" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobAssessment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JobAssessment_jobId_key" ON "JobAssessment"("jobId");
CREATE INDEX IF NOT EXISTS "JobAssessment_companyId_idx" ON "JobAssessment"("companyId");

CREATE TABLE IF NOT EXISTS "AssessmentInvite" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "assessmentId" UUID,
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "score" INTEGER,
  "passed" BOOLEAN,
  "result" JSONB,
  "answers" JSONB,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentInvite_token_key" ON "AssessmentInvite"("token");
CREATE INDEX IF NOT EXISTS "AssessmentInvite_companyId_applicationId_idx" ON "AssessmentInvite"("companyId", "applicationId");
