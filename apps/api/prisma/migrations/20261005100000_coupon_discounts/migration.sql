-- Cupons com desconto (percentual / valor fixo) e aplicacao na assinatura. Aditiva e idempotente.
ALTER TABLE "PromotionCoupon" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'TRIAL_DAYS';
ALTER TABLE "PromotionCoupon" ADD COLUMN IF NOT EXISTS "value" DECIMAL(10,2);
ALTER TABLE "PromotionCoupon" ADD COLUMN IF NOT EXISTS "durationCycles" INTEGER;
ALTER TABLE "PromotionCoupon" ADD COLUMN IF NOT EXISTS "allowedPlanIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PromotionCoupon" ADD COLUMN IF NOT EXISTS "minSeats" INTEGER;
ALTER TABLE "PromotionCoupon" ADD COLUMN IF NOT EXISTS "createdBy" UUID;

ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "couponId" UUID;
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "couponType" TEXT;
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "couponValue" DECIMAL(10,2);
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "couponCyclesLeft" INTEGER;
