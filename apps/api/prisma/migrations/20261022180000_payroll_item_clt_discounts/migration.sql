-- Folha manual da contabilidade: descontos CLT (empréstimo, consignado, VT, VA, pensão, plano de saúde)
-- e marcação de lançamento manual com auditoria (quem, quando e motivo).
ALTER TYPE "PayrollItemType" ADD VALUE IF NOT EXISTS 'CLT_LOAN';
ALTER TYPE "PayrollItemType" ADD VALUE IF NOT EXISTS 'CONSIGNADO';
ALTER TYPE "PayrollItemType" ADD VALUE IF NOT EXISTS 'VALE_TRANSPORTE';
ALTER TYPE "PayrollItemType" ADD VALUE IF NOT EXISTS 'VALE_ALIMENTACAO';
ALTER TYPE "PayrollItemType" ADD VALUE IF NOT EXISTS 'PENSAO_ALIMENTICIA';
ALTER TYPE "PayrollItemType" ADD VALUE IF NOT EXISTS 'PLANO_SAUDE';

ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "isManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "manualReason" TEXT;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "editedById" UUID;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "isColumnLine" BOOLEAN NOT NULL DEFAULT false;
