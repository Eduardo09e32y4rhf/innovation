-- Responsaveis por vaga (escopo do RH - R&S)
CREATE TABLE "JobRecruiter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobRecruiter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobRecruiter_jobId_userId_key" ON "JobRecruiter"("jobId", "userId");
CREATE INDEX "JobRecruiter_companyId_userId_idx" ON "JobRecruiter"("companyId", "userId");

ALTER TABLE "JobRecruiter" ADD CONSTRAINT "JobRecruiter_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobRecruiter" ADD CONSTRAINT "JobRecruiter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;