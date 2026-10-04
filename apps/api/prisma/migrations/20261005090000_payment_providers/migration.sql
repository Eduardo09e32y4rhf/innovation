-- Provedores de pagamento (Asaas / Mercado Pago). Migration aditiva e idempotente.
ALTER TABLE "PlatformInvoice" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'ASAAS';
ALTER TABLE "PlatformInvoice" ADD COLUMN IF NOT EXISTS "mpPaymentId" TEXT;
ALTER TABLE "PlatformInvoice" ADD COLUMN IF NOT EXISTS "mpPreferenceId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformInvoice_mpPaymentId_key" ON "PlatformInvoice"("mpPaymentId");

CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);
