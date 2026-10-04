-- Adiciona o papel DEV (super-admin global) ao enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DEV' BEFORE 'ADMIN';

-- Campos de limite e status por empresa
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "maxUsers"     INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "maxEmployees" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "isActive"     BOOLEAN NOT NULL DEFAULT true;
