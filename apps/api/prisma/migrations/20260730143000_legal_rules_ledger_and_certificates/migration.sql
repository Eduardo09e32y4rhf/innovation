-- Versioned payroll tables, vacation ledger and medical certificates.
CREATE TYPE "VacationEntitlementStatus" AS ENUM ('OPEN', 'EXHAUSTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "VacationPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
CREATE TYPE "MedicalCertificateType" AS ENUM ('FULL_DAY', 'HOURS', 'DAYS');
CREATE TYPE "MedicalCertificateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PayrollTaxType" AS ENUM ('INSS', 'IRRF');

ALTER TABLE "Vacation"
  ADD COLUMN "entitlementId" UUID,
  ADD COLUMN "soldDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "paymentDueDate" TIMESTAMP(3),
  ADD COLUMN "paidAt" TIMESTAMP(3);

ALTER TABLE "TimeClosing" ADD COLUMN "taxTableSnapshot" JSONB;

CREATE TABLE "VacationEntitlement" (
  "id" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "acquisitionStart" DATE NOT NULL,
  "acquisitionEnd" DATE NOT NULL,
  "concessionStart" DATE NOT NULL,
  "concessionEnd" DATE NOT NULL,
  "originalDays" INTEGER NOT NULL DEFAULT 30,
  "entitledDays" INTEGER NOT NULL,
  "reservedDays" INTEGER NOT NULL DEFAULT 0,
  "usedDays" INTEGER NOT NULL DEFAULT 0,
  "soldDays" INTEGER NOT NULL DEFAULT 0,
  "unjustifiedAbsences" INTEGER NOT NULL DEFAULT 0,
  "ruleVersion" TEXT NOT NULL DEFAULT 'CLT_VACATION_2026_1',
  "status" "VacationEntitlementStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VacationEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VacationPayment" (
  "id" UUID NOT NULL,
  "vacationId" UUID NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "dueDate" DATE NOT NULL,
  "paidAt" TIMESTAMP(3),
  "status" "VacationPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT,
  "reference" TEXT,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VacationPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VacationAuditLog" (
  "id" UUID NOT NULL,
  "vacationId" UUID,
  "entitlementId" UUID,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT,
  "actorUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VacationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalCertificate" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "certificateType" "MedicalCertificateType" NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "coveredMinutes" INTEGER NOT NULL,
  "issueDate" DATE NOT NULL,
  "issuerName" TEXT,
  "issuerRegistration" TEXT,
  "documentId" TEXT,
  "status" "MedicalCertificateStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "createdByUserId" UUID,
  "reviewedByUserId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicalCertificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollTaxTable" (
  "id" UUID NOT NULL,
  "taxType" "PayrollTaxType" NOT NULL,
  "version" TEXT NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "brackets" JSONB NOT NULL,
  "parameters" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollTaxTable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VacationEntitlement_employeeId_acquisitionStart_acquisitionEnd_key"
  ON "VacationEntitlement"("employeeId", "acquisitionStart", "acquisitionEnd");
CREATE INDEX "VacationEntitlement_employeeId_status_concessionEnd_idx"
  ON "VacationEntitlement"("employeeId", "status", "concessionEnd");
CREATE INDEX "Vacation_entitlementId_idx" ON "Vacation"("entitlementId");
CREATE INDEX "VacationPayment_vacationId_status_idx" ON "VacationPayment"("vacationId", "status");
CREATE INDEX "VacationPayment_dueDate_status_idx" ON "VacationPayment"("dueDate", "status");
CREATE INDEX "VacationAuditLog_vacationId_createdAt_idx" ON "VacationAuditLog"("vacationId", "createdAt");
CREATE INDEX "VacationAuditLog_entitlementId_createdAt_idx" ON "VacationAuditLog"("entitlementId", "createdAt");
CREATE INDEX "MedicalCertificate_companyId_employeeId_startAt_idx"
  ON "MedicalCertificate"("companyId", "employeeId", "startAt");
CREATE INDEX "MedicalCertificate_companyId_status_idx" ON "MedicalCertificate"("companyId", "status");
CREATE UNIQUE INDEX "PayrollTaxTable_taxType_version_key" ON "PayrollTaxTable"("taxType", "version");
CREATE INDEX "PayrollTaxTable_taxType_active_effectiveFrom_effectiveTo_idx"
  ON "PayrollTaxTable"("taxType", "active", "effectiveFrom", "effectiveTo");

ALTER TABLE "VacationEntitlement"
  ADD CONSTRAINT "VacationEntitlement_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vacation"
  ADD CONSTRAINT "Vacation_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "VacationEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VacationPayment"
  ADD CONSTRAINT "VacationPayment_vacationId_fkey"
  FOREIGN KEY ("vacationId") REFERENCES "Vacation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VacationAuditLog"
  ADD CONSTRAINT "VacationAuditLog_vacationId_fkey"
  FOREIGN KEY ("vacationId") REFERENCES "Vacation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VacationAuditLog"
  ADD CONSTRAINT "VacationAuditLog_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "VacationEntitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalCertificate"
  ADD CONSTRAINT "MedicalCertificate_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalCertificate"
  ADD CONSTRAINT "MedicalCertificate_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PayrollTaxTable"
  ("id", "taxType", "version", "effectiveFrom", "effectiveTo", "brackets", "parameters", "active", "updatedAt")
VALUES
  (
    gen_random_uuid(),
    'INSS',
    'INSS_2026_1',
    DATE '2026-01-01',
    DATE '2026-12-31',
    '[{"limit":1621.00,"rate":0.075},{"limit":2902.84,"rate":0.09},{"limit":4354.27,"rate":0.12},{"limit":8475.55,"rate":0.14}]'::jsonb,
    '{"ceiling":8475.55}'::jsonb,
    true,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'IRRF',
    'IRRF_2026_1',
    DATE '2026-01-01',
    DATE '2026-12-31',
    '[{"limit":2428.80,"rate":0,"deduction":0},{"limit":2826.65,"rate":0.075,"deduction":182.16},{"limit":3751.05,"rate":0.15,"deduction":394.16},{"limit":4664.68,"rate":0.225,"deduction":675.49},{"limit":null,"rate":0.275,"deduction":908.73}]'::jsonb,
    '{"dependentDeduction":189.59,"simplifiedDeduction":607.20,"fullExemptionLimit":5000,"partialExemptionLimit":7350,"partialReductionBase":978.62,"partialReductionFactor":0.133145}'::jsonb,
    true,
    CURRENT_TIMESTAMP
  );
