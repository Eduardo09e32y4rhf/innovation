-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "amountRequested" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "returnCode" TEXT,
    "sanitizedMessage" TEXT,
    "providerId" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentAttempt_invoiceId_idx" ON "PaymentAttempt"("invoiceId");
CREATE INDEX "PaymentAttempt_attemptedAt_idx" ON "PaymentAttempt"("attemptedAt");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
