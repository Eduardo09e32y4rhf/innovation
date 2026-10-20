-- DropIndex
DROP INDEX "Application_companyId_employeeId_idx";

-- DropIndex
DROP INDEX "Application_retentionUntil_idx";

-- AlterTable
ALTER TABLE "CandidateAccount" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CandidateLoginCode" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CandidateSession" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CompanyPosition" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DocumentTemplate" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EmployeePromotion" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PayrollDeductionRule" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PromotionPolicy" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Employee_companyId_status_idx" ON "Employee"("companyId", "status");

-- CreateIndex
CREATE INDEX "Employee_companyId_name_idx" ON "Employee"("companyId", "name");
