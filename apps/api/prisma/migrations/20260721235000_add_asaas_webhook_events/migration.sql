CREATE TABLE "AsaasWebhookEvent" (
  "id" TEXT NOT NULL,
  "asaasEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AsaasWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AsaasWebhookEvent_asaasEventId_key" ON "AsaasWebhookEvent"("asaasEventId");
CREATE INDEX "AsaasWebhookEvent_status_idx" ON "AsaasWebhookEvent"("status");
CREATE INDEX "AsaasWebhookEvent_eventType_idx" ON "AsaasWebhookEvent"("eventType");
CREATE INDEX "AsaasWebhookEvent_createdAt_idx" ON "AsaasWebhookEvent"("createdAt");
