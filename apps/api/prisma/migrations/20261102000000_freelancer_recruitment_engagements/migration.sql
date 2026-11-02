-- Recrutador freelancer: contrato empresa-a-empresa, delegacao explicita de vaga e faturamento do servico de
-- recrutamento. Totalmente aditivo: nao altera nenhuma tabela/isolamento ja existente do modulo de recrutamento.

CREATE TYPE "FreelancerEngagementStatus" AS ENUM ('NEGOTIATION', 'ACTIVE', 'INACTIVE', 'ENDED');
CREATE TYPE "JobDelegationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REVOKED');
CREATE TYPE "RecruitmentInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'OVERDUE', 'PAID', 'DISPUTED', 'CANCELLED');

CREATE TABLE "FreelancerEngagement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "freelancerCompanyId" UUID NOT NULL,
  "clientCompanyId" UUID NOT NULL,
  "status" "FreelancerEngagementStatus" NOT NULL DEFAULT 'NEGOTIATION',
  "scope" TEXT,
  "contractedPositions" INTEGER,
  "positionValue" DECIMAL(12,2),
  "signupFee" DECIMAL(12,2),
  "monthlyFee" DECIMAL(12,2),
  "warrantyDays" INTEGER NOT NULL DEFAULT 90,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FreelancerEngagement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FreelancerEngagement_freelancerCompanyId_fkey" FOREIGN KEY ("freelancerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FreelancerEngagement_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FreelancerEngagement_freelancerCompanyId_clientCompanyId_key" ON "FreelancerEngagement"("freelancerCompanyId", "clientCompanyId");
CREATE INDEX "FreelancerEngagement_freelancerCompanyId_status_idx" ON "FreelancerEngagement"("freelancerCompanyId", "status");
CREATE INDEX "FreelancerEngagement_clientCompanyId_status_idx" ON "FreelancerEngagement"("clientCompanyId", "status");

CREATE TABLE "JobDelegation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "engagementId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "clientCompanyId" UUID NOT NULL,
  "freelancerCompanyId" UUID NOT NULL,
  "status" "JobDelegationStatus" NOT NULL DEFAULT 'ACTIVE',
  "warrantyEndsAt" TIMESTAMP(3),
  "delegatedById" UUID NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobDelegation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobDelegation_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "FreelancerEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JobDelegation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JobDelegation_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JobDelegation_freelancerCompanyId_fkey" FOREIGN KEY ("freelancerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JobDelegation_jobId_key" ON "JobDelegation"("jobId");
CREATE INDEX "JobDelegation_freelancerCompanyId_status_idx" ON "JobDelegation"("freelancerCompanyId", "status");
CREATE INDEX "JobDelegation_clientCompanyId_idx" ON "JobDelegation"("clientCompanyId");

CREATE TABLE "JobDelegationGrant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "delegationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobDelegationGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobDelegationGrant_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "JobDelegation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JobDelegationGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JobDelegationGrant_delegationId_userId_key" ON "JobDelegationGrant"("delegationId", "userId");
CREATE INDEX "JobDelegationGrant_userId_idx" ON "JobDelegationGrant"("userId");

CREATE TABLE "RecruitmentInvoice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "engagementId" UUID NOT NULL,
  "freelancerCompanyId" UUID NOT NULL,
  "clientCompanyId" UUID NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "RecruitmentInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "paidAt" TIMESTAMP(3),
  "paymentMethod" TEXT,
  "disputeReason" TEXT,
  "disputedAt" TIMESTAMP(3),
  "disputedById" UUID,
  "attachmentUrl" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruitmentInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecruitmentInvoice_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "FreelancerEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecruitmentInvoice_freelancerCompanyId_fkey" FOREIGN KEY ("freelancerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecruitmentInvoice_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RecruitmentInvoice_freelancerCompanyId_invoiceNumber_key" ON "RecruitmentInvoice"("freelancerCompanyId", "invoiceNumber");
CREATE INDEX "RecruitmentInvoice_freelancerCompanyId_status_idx" ON "RecruitmentInvoice"("freelancerCompanyId", "status");
CREATE INDEX "RecruitmentInvoice_clientCompanyId_status_idx" ON "RecruitmentInvoice"("clientCompanyId", "status");

CREATE TABLE "RecruitmentInvoiceItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoiceId" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "jobId" UUID,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "totalPrice" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "RecruitmentInvoiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecruitmentInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "RecruitmentInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecruitmentInvoiceItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "RecruitmentInvoiceItem_invoiceId_idx" ON "RecruitmentInvoiceItem"("invoiceId");
CREATE INDEX "RecruitmentInvoiceItem_jobId_idx" ON "RecruitmentInvoiceItem"("jobId");
