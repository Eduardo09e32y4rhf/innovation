-- Descontos da empresa no fechamento, promocoes automaticas e modelos de documento da empresa.

ALTER TABLE "TimeClosing" ADD COLUMN IF NOT EXISTS "benefitsDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TimeClosing" ADD COLUMN IF NOT EXISTS "deductionsJson" JSONB;

CREATE TABLE IF NOT EXISTS "PayrollDeductionRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'BENEFIT',
  "kind" TEXT NOT NULL,
  "value" DECIMAL(12,4) NOT NULL,
  "base" TEXT NOT NULL DEFAULT 'GROSS',
  "maxAmount" DECIMAL(12,2),
  "scope" TEXT NOT NULL DEFAULT 'ALL',
  "targets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "startDate" DATE,
  "endDate" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayrollDeductionRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayrollDeductionRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PayrollDeductionRule_companyId_isActive_idx" ON "PayrollDeductionRule"("companyId", "isActive");

CREATE TABLE IF NOT EXISTS "PromotionPolicy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "minMonthsInRole" INTEGER NOT NULL DEFAULT 0,
  "maxRaisePercent" DECIMAL(6,2),
  "requireReason" BOOLEAN NOT NULL DEFAULT true,
  "positions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "autoNotify" BOOLEAN NOT NULL DEFAULT true,
  "updatedByUserId" UUID,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromotionPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PromotionPolicy_companyId_key" ON "PromotionPolicy"("companyId");

CREATE TABLE IF NOT EXISTS "EmployeePromotion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "previousPosition" TEXT,
  "newPosition" TEXT,
  "previousSalary" DECIMAL(12,2),
  "newSalary" DECIMAL(12,2),
  "effectiveDate" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "reason" TEXT,
  "notificationId" UUID,
  "createdByUserId" UUID,
  "appliedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeePromotion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeePromotion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmployeePromotion_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "EmployeePromotion_companyId_status_effectiveDate_idx" ON "EmployeePromotion"("companyId", "status", "effectiveDate");
CREATE INDEX IF NOT EXISTS "EmployeePromotion_employeeId_idx" ON "EmployeePromotion"("employeeId");

CREATE TABLE IF NOT EXISTS "DocumentTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DocumentTemplate_companyId_kind_isActive_idx" ON "DocumentTemplate"("companyId", "kind", "isActive");
