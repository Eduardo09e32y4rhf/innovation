-- Cancelamento de assinatura agendado para o fim do ciclo
ALTER TABLE "CompanySubscription" ADD COLUMN "cancelAt" TIMESTAMP(3);
ALTER TYPE "InvoiceAdjustmentType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_CANCELED';
