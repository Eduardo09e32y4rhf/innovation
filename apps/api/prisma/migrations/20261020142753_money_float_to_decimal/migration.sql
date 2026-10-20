/*
  Warnings:

  - You are about to alter the column `monthlyPrice` on the `Proposal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `dsrValue` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `totalPayable` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `salaryBase` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `hourlyRate` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,4)`.
  - You are about to alter the column `overtime50Value` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `overtime100Value` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `nightShiftValue` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `absenceDiscount` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `lateDiscount` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `earlyLeaveDiscount` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `grossPay` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `inssBase` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `inssDiscount` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `irrfBase` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `irrfDiscount` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `fgtsBase` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `fgtsAmount` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `netPay` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `benefitsDiscount` on the `TimeClosing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `estimatedCostUsd` on the `ai_usage_logs` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,6)`.

*/
-- AlterTable
ALTER TABLE "Proposal" ALTER COLUMN "monthlyPrice" SET DATA TYPE DECIMAL(14,2) USING ROUND("monthlyPrice"::numeric, 2);

-- AlterTable
ALTER TABLE "TimeClosing" ALTER COLUMN "dsrValue" SET DATA TYPE DECIMAL(14,2) USING ROUND("dsrValue"::numeric, 2),
ALTER COLUMN "totalPayable" SET DATA TYPE DECIMAL(14,2) USING ROUND("totalPayable"::numeric, 2),
ALTER COLUMN "salaryBase" SET DATA TYPE DECIMAL(14,2) USING ROUND("salaryBase"::numeric, 2),
ALTER COLUMN "hourlyRate" SET DATA TYPE DECIMAL(14,4) USING ROUND("hourlyRate"::numeric, 4),
ALTER COLUMN "overtime50Value" SET DATA TYPE DECIMAL(14,2) USING ROUND("overtime50Value"::numeric, 2),
ALTER COLUMN "overtime100Value" SET DATA TYPE DECIMAL(14,2) USING ROUND("overtime100Value"::numeric, 2),
ALTER COLUMN "nightShiftValue" SET DATA TYPE DECIMAL(14,2) USING ROUND("nightShiftValue"::numeric, 2),
ALTER COLUMN "absenceDiscount" SET DATA TYPE DECIMAL(14,2) USING ROUND("absenceDiscount"::numeric, 2),
ALTER COLUMN "lateDiscount" SET DATA TYPE DECIMAL(14,2) USING ROUND("lateDiscount"::numeric, 2),
ALTER COLUMN "earlyLeaveDiscount" SET DATA TYPE DECIMAL(14,2) USING ROUND("earlyLeaveDiscount"::numeric, 2),
ALTER COLUMN "grossPay" SET DATA TYPE DECIMAL(14,2) USING ROUND("grossPay"::numeric, 2),
ALTER COLUMN "inssBase" SET DATA TYPE DECIMAL(14,2) USING ROUND("inssBase"::numeric, 2),
ALTER COLUMN "inssDiscount" SET DATA TYPE DECIMAL(14,2) USING ROUND("inssDiscount"::numeric, 2),
ALTER COLUMN "irrfBase" SET DATA TYPE DECIMAL(14,2) USING ROUND("irrfBase"::numeric, 2),
ALTER COLUMN "irrfDiscount" SET DATA TYPE DECIMAL(14,2) USING ROUND("irrfDiscount"::numeric, 2),
ALTER COLUMN "fgtsBase" SET DATA TYPE DECIMAL(14,2) USING ROUND("fgtsBase"::numeric, 2),
ALTER COLUMN "fgtsAmount" SET DATA TYPE DECIMAL(14,2) USING ROUND("fgtsAmount"::numeric, 2),
ALTER COLUMN "netPay" SET DATA TYPE DECIMAL(14,2) USING ROUND("netPay"::numeric, 2),
ALTER COLUMN "benefitsDiscount" SET DATA TYPE DECIMAL(14,2) USING ROUND("benefitsDiscount"::numeric, 2);

-- AlterTable
ALTER TABLE "ai_usage_logs" ALTER COLUMN "estimatedCostUsd" SET DATA TYPE DECIMAL(14,6) USING ROUND("estimatedCostUsd"::numeric, 6);
