-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "platformPlanId" UUID;

-- CreateTable
CREATE TABLE "GlobalRolePermission" (
    "role" "UserRole" NOT NULL,
    "permissions" TEXT[],

    CONSTRAINT "GlobalRolePermission_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "PlatformPlan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "maxUsers" INTEGER NOT NULL DEFAULT 9999,
    "maxEmployees" INTEGER NOT NULL DEFAULT 9999,
    "activeModules" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvoice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "planId" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformContract" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "documentUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "contentHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformContract_companyId_key" ON "PlatformContract"("companyId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_platformPlanId_fkey" FOREIGN KEY ("platformPlanId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContract" ADD CONSTRAINT "PlatformContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
