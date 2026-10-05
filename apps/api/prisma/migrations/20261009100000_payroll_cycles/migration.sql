-- Ciclo de folha definido pelo RH (inicio e fim), cancelamento e fim da trava de um registro por mes.
DROP INDEX IF EXISTS "Payroll_companyId_employeeId_referenceMonth_referenceYear_key";

ALTER TABLE "Payroll" ADD COLUMN "periodStart" DATE;
ALTER TABLE "Payroll" ADD COLUMN "periodEnd" DATE;
ALTER TABLE "Payroll" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Payroll" ADD COLUMN "cancelReason" TEXT;

UPDATE "Payroll"
SET "periodStart" = make_date("referenceYear", "referenceMonth", 1),
    "periodEnd" = (make_date("referenceYear", "referenceMonth", 1) + INTERVAL '1 month - 1 day')::date
WHERE "periodStart" IS NULL;

CREATE INDEX "Payroll_companyId_employeeId_periodStart_periodEnd_idx" ON "Payroll"("companyId", "employeeId", "periodStart", "periodEnd");