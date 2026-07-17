ALTER TABLE "PlatformInvoice"
ADD COLUMN "description" TEXT,
ADD COLUMN "billingType" TEXT NOT NULL DEFAULT 'UNDEFINED',
ADD COLUMN "asaasPaymentId" TEXT,
ADD COLUMN "invoiceUrl" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "PlatformInvoice_asaasPaymentId_key" ON "PlatformInvoice"("asaasPaymentId");
CREATE INDEX "PlatformInvoice_companyId_status_dueDate_idx" ON "PlatformInvoice"("companyId", "status", "dueDate");
CREATE INDEX "PlatformInvoice_deletedAt_idx" ON "PlatformInvoice"("deletedAt");