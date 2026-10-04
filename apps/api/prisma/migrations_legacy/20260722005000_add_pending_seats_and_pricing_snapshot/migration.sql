ALTER TABLE "CompanySubscription"
  ADD COLUMN "pendingSeatQuantity" INTEGER;

ALTER TABLE "PlatformInvoice"
  ADD COLUMN "pricingSnapshot" JSONB;
