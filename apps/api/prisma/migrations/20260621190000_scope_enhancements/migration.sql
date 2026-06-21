-- AlterEnum: add CONSULTA role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONSULTA';

-- AlterTable: Company - add settings fields
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'light';

-- AlterTable: Employee - add PJ fields
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "cnpj" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "tradeName" TEXT;
