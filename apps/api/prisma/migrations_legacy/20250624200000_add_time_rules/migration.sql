CREATE TYPE "TimeRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "TimeClosingStatus" AS ENUM (
  'OPEN',
  'IN_ADJUSTMENT',
  'PENDING_APPROVAL',
  'APPROVED',
  'CLOSED',
  'REOPENED',
  'EXPORTED'
);
CREATE TYPE "TimeOccurrenceType" AS ENUM (
  'LATE_ARRIVAL',
  'EARLY_LEAVE',
  'ABSENCE',
  'JUSTIFIED_ABSENCE',
  'UNJUSTIFIED_ABSENCE',
  'MEDICAL_CERTIFICATE',
  'MANUAL_ADJUSTMENT',
  'MISSING_PUNCH',
  'OVERTIME',
  'NEGATIVE_BALANCE',
  'POSITIVE_BALANCE',
  'DAY_OFF',
  'DSR',
  'HOLIDAY',
  'VACATION',
  'LEAVE',
  'EXTERNAL_WORK',
  'HOME_OFFICE',
  'TRAINING'
);

CREATE TABLE "work_schedule_rules" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "dailyMinutes" INTEGER NOT NULL,
  "weeklyMinutes" INTEGER NOT NULL,
  "entryTime" TEXT,
  "exitTime" TEXT,
  "breakMinutes" INTEGER NOT NULL DEFAULT 60,
  "lateToleranceMinutes" INTEGER NOT NULL DEFAULT 0,
  "earlyLeaveToleranceMinutes" INTEGER NOT NULL DEFAULT 0,
  "overtimeToleranceMinutes" INTEGER NOT NULL DEFAULT 0,
  "overtimeEnabled" BOOLEAN NOT NULL DEFAULT true,
  "timeBankEnabled" BOOLEAN NOT NULL DEFAULT false,
  "normalOvertimePercent" INTEGER NOT NULL DEFAULT 50,
  "holidayOvertimePercent" INTEGER NOT NULL DEFAULT 100,
  "nightShiftEnabled" BOOLEAN NOT NULL DEFAULT false,
  "nightStartTime" TEXT,
  "nightEndTime" TEXT,
  "closingStartDay" INTEGER NOT NULL,
  "closingEndDay" INTEGER NOT NULL,
  "adjustmentDeadlineDay" INTEGER NOT NULL,
  "managerApprovalDeadlineDay" INTEGER NOT NULL,
  "status" "TimeRuleStatus" NOT NULL DEFAULT 'ACTIVE',
  "department" TEXT,
  "position" TEXT,
  "workScale" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "work_schedule_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_closing_periods" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "referenceMonth" INTEGER NOT NULL,
  "referenceYear" INTEGER NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "status" "TimeClosingStatus" NOT NULL DEFAULT 'OPEN',
  "closedByUserId" TEXT,
  "closedAt" TIMESTAMP,
  "reopenedByUserId" TEXT,
  "reopenReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "time_closing_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_occurrences" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "timeTrackId" TEXT,
  "type" "TimeOccurrenceType" NOT NULL,
  "date" DATE NOT NULL,
  "minutes" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT,
  "observation" TEXT,
  "createdByUserId" TEXT,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "time_occurrences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_closing_summaries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "closingPeriodId" TEXT NOT NULL,
  "expectedMinutes" INTEGER NOT NULL,
  "workedMinutes" INTEGER NOT NULL,
  "overtimeMinutes" INTEGER NOT NULL,
  "delayMinutes" INTEGER NOT NULL,
  "absenceDays" INTEGER NOT NULL,
  "justifiedAbsenceDays" INTEGER NOT NULL,
  "timeBankPositiveMinutes" INTEGER NOT NULL,
  "timeBankNegativeMinutes" INTEGER NOT NULL,
  "status" "TimeClosingStatus" NOT NULL DEFAULT 'OPEN',
  "exportedPdfUrl" TEXT,
  "exportedExcelUrl" TEXT,
  "exportedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "time_closing_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "time_closing_periods_companyId_referenceMonth_referenceYear_key"
  ON "time_closing_periods"("companyId", "referenceMonth", "referenceYear");

CREATE INDEX "work_schedule_rules_companyId_idx" ON "work_schedule_rules"("companyId");
CREATE INDEX "work_schedule_rules_status_idx" ON "work_schedule_rules"("status");
CREATE INDEX "time_closing_periods_companyId_idx" ON "time_closing_periods"("companyId");
CREATE INDEX "time_closing_periods_status_idx" ON "time_closing_periods"("status");
CREATE INDEX "time_occurrences_companyId_idx" ON "time_occurrences"("companyId");
CREATE INDEX "time_occurrences_employeeId_idx" ON "time_occurrences"("employeeId");
CREATE INDEX "time_occurrences_date_idx" ON "time_occurrences"("date");
CREATE INDEX "time_occurrences_type_idx" ON "time_occurrences"("type");
CREATE INDEX "time_closing_summaries_companyId_idx" ON "time_closing_summaries"("companyId");
CREATE INDEX "time_closing_summaries_employeeId_idx" ON "time_closing_summaries"("employeeId");
CREATE INDEX "time_closing_summaries_closingPeriodId_idx" ON "time_closing_summaries"("closingPeriodId");

ALTER TABLE "work_schedule_rules"
  ADD CONSTRAINT "work_schedule_rules_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "time_closing_periods"
  ADD CONSTRAINT "time_closing_periods_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "time_occurrences"
  ADD CONSTRAINT "time_occurrences_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "time_closing_summaries"
  ADD CONSTRAINT "time_closing_summaries_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE;