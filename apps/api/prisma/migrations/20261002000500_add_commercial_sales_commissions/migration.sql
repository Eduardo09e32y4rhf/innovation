CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'PAID', 'CANCELED', 'REVERSED');

CREATE TABLE "CommercialSale" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "sellerId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "planId" UUID,
  "cycle" TEXT,
  "contractValue" DECIMAL(10,2) NOT NULL,
  "recurrence" BOOLEAN NOT NULL DEFAULT false,
  "snapshot" JSONB,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "paymentReference" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialSale_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommercialSale_companyId_idx" ON "CommercialSale"("companyId");
CREATE INDEX "CommercialSale_sellerId_createdAt_idx" ON "CommercialSale"("sellerId", "createdAt");
CREATE UNIQUE INDEX "CommercialSale_idempotencyKey_key" ON "CommercialSale"("idempotencyKey");
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CommissionEntry" (
  "id" UUID NOT NULL,
  "saleId" UUID NOT NULL,
  "beneficiaryId" UUID NOT NULL,
  "baseValue" DECIMAL(10,2) NOT NULL,
  "percentageApplied" DECIMAL(5,2) NOT NULL,
  "commissionValue" DECIMAL(10,2) NOT NULL,
  "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "paymentReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommissionEntry_beneficiaryId_status_idx" ON "CommissionEntry"("beneficiaryId", "status");
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "CommercialSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
