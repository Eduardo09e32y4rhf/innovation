-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('DRAFT', 'CALCULATED', 'PUBLISHED', 'RETURNED', 'RELEASED', 'PAID');

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "gross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inss" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fgts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "irrf" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employees" INTEGER NOT NULL DEFAULT 0,
    "calculatedById" UUID,
    "calculatedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "publishedAt" TIMESTAMP(3),
    "returnedById" UUID,
    "returnedAt" TIMESTAMP(3),
    "returnComment" TEXT,
    "releasedById" UUID,
    "releasedAt" TIMESTAMP(3),
    "paidById" UUID,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingPeriod_companyId_status_idx" ON "AccountingPeriod"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_companyId_month_key" ON "AccountingPeriod"("companyId", "month");
