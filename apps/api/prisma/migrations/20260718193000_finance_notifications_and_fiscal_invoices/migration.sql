CREATE TABLE "FinancialNotificationSettings" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "internalNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyChargeCreated" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentOverdue" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentCanceled" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvoiceAuthorized" BOOLEAN NOT NULL DEFAULT true,
    "notifyBeforeDueDate" BOOLEAN NOT NULL DEFAULT true,
    "whatsappPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialNotificationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceNotificationLog" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "paymentId" TEXT,
    "fiscalInvoiceId" UUID,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformFiscalInvoice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "platformInvoiceId" UUID,
    "asaasInvoiceId" TEXT NOT NULL,
    "asaasPaymentId" TEXT,
    "number" TEXT,
    "series" TEXT,
    "validationCode" TEXT,
    "amount" DECIMAL(10,2),
    "status" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "errorMessage" TEXT,
    "rawPayload" JSONB,
    "authorizedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFiscalInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialNotificationSettings_companyId_key" ON "FinancialNotificationSettings"("companyId");
CREATE UNIQUE INDEX "FinanceNotificationLog_idempotencyKey_key" ON "FinanceNotificationLog"("idempotencyKey");
CREATE INDEX "FinanceNotificationLog_companyId_createdAt_idx" ON "FinanceNotificationLog"("companyId", "createdAt");
CREATE INDEX "FinanceNotificationLog_paymentId_idx" ON "FinanceNotificationLog"("paymentId");
CREATE INDEX "FinanceNotificationLog_fiscalInvoiceId_idx" ON "FinanceNotificationLog"("fiscalInvoiceId");
CREATE UNIQUE INDEX "PlatformFiscalInvoice_asaasInvoiceId_key" ON "PlatformFiscalInvoice"("asaasInvoiceId");
CREATE INDEX "PlatformFiscalInvoice_companyId_effectiveDate_idx" ON "PlatformFiscalInvoice"("companyId", "effectiveDate");
CREATE INDEX "PlatformFiscalInvoice_asaasPaymentId_idx" ON "PlatformFiscalInvoice"("asaasPaymentId");

ALTER TABLE "FinancialNotificationSettings" ADD CONSTRAINT "FinancialNotificationSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceNotificationLog" ADD CONSTRAINT "FinanceNotificationLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformFiscalInvoice" ADD CONSTRAINT "PlatformFiscalInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformFiscalInvoice" ADD CONSTRAINT "PlatformFiscalInvoice_platformInvoiceId_fkey" FOREIGN KEY ("platformInvoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;