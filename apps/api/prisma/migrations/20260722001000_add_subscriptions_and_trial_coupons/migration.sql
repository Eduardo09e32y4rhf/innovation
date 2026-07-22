CREATE TABLE "CompanySubscription" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "planId" UUID,
  "status" TEXT NOT NULL,
  "seatQuantity" INTEGER NOT NULL DEFAULT 1,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "nextDueDate" TIMESTAMP(3),
  "trialStartedAt" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "pricingVersion" TEXT,
  "baseMonthlyPrice" DECIMAL(10,2),
  "userMonthlyPrice" DECIMAL(10,2),
  "discountPercent" DECIMAL(5,2),
  "asaasCustomerId" TEXT,
  "asaasSubscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromotionCoupon" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "trialDays" INTEGER NOT NULL DEFAULT 30,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "maxRedemptions" INTEGER,
  "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionCoupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponRedemption" (
  "id" UUID NOT NULL,
  "couponId" UUID NOT NULL,
  "companyId" UUID,
  "documentHash" TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanySubscription_companyId_key" ON "CompanySubscription"("companyId");
CREATE INDEX "CompanySubscription_status_idx" ON "CompanySubscription"("status");
CREATE INDEX "CompanySubscription_nextDueDate_idx" ON "CompanySubscription"("nextDueDate");
CREATE INDEX "CompanySubscription_trialEndsAt_idx" ON "CompanySubscription"("trialEndsAt");
CREATE UNIQUE INDEX "PromotionCoupon_code_key" ON "PromotionCoupon"("code");
CREATE INDEX "PromotionCoupon_isActive_startsAt_expiresAt_idx" ON "PromotionCoupon"("isActive", "startsAt", "expiresAt");
CREATE UNIQUE INDEX "CouponRedemption_documentHash_key" ON "CouponRedemption"("documentHash");
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");
CREATE INDEX "CouponRedemption_companyId_idx" ON "CouponRedemption"("companyId");

ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "PromotionCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
