ALTER TABLE "CompanySubscription"
  ADD COLUMN "billingPaused" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "billingPausedAt" TIMESTAMP(3),
  ADD COLUMN "billingPausedBy" UUID;

CREATE INDEX "CompanySubscription_billingPaused_idx" ON "CompanySubscription"("billingPaused");
