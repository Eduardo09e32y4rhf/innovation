-- Livro de ajustes financeiros da aba Faturas
CREATE TYPE "InvoiceAdjustmentType" AS ENUM ('DISCOUNT', 'RECURRING_DISCOUNT', 'FREE_DAYS', 'PARTIAL_REFUND', 'PRORATION', 'FISCAL_ATTACHED');

CREATE TABLE "InvoiceAdjustment" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "invoiceId" UUID,
    "type" "InvoiceAdjustmentType" NOT NULL,
    "amount" DECIMAL(10,2),
    "days" INTEGER,
    "reason" TEXT NOT NULL,
    "createdById" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceAdjustment_companyId_createdAt_idx" ON "InvoiceAdjustment"("companyId", "createdAt");
CREATE INDEX "InvoiceAdjustment_invoiceId_idx" ON "InvoiceAdjustment"("invoiceId");

ALTER TABLE "InvoiceAdjustment" ADD CONSTRAINT "InvoiceAdjustment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceAdjustment" ADD CONSTRAINT "InvoiceAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;