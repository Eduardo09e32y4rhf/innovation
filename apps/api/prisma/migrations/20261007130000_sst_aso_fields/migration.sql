-- ASO / PCMSO: periodicidade, restricoes e exames complementares
ALTER TABLE "employee_aso_records" ADD COLUMN "periodicityMonths" INTEGER,
  ADD COLUMN "restrictions" TEXT,
  ADD COLUMN "examsPerformed" JSONB;
