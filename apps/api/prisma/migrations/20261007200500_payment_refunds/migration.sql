ALTER TABLE "PlatformInvoice" ADD COLUMN "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "PlatformInvoice" ADD COLUMN "refundStatus" TEXT;
CREATE TABLE "PaymentRefund" (
  "id" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "requestKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "provider" TEXT NOT NULL,
  "providerRefundId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "reason" TEXT NOT NULL,
  "actorId" UUID,
  "errorMessage" TEXT,
  "receiptUrl" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentRefund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentRefund_requestKey_key" ON "PaymentRefund"("requestKey");
CREATE INDEX "PaymentRefund_invoiceId_status_idx" ON "PaymentRefund"("invoiceId", "status");
CREATE INDEX "PaymentRefund_status_updatedAt_idx" ON "PaymentRefund"("status", "updatedAt");

ALTER TABLE "PlatformInvoice" ADD COLUMN "paymentProcessingStatus" TEXT NOT NULL DEFAULT 'LOCAL', ADD COLUMN "chargeRequestKey" TEXT;
CREATE UNIQUE INDEX "PlatformInvoice_chargeRequestKey_key" ON "PlatformInvoice"("chargeRequestKey");
