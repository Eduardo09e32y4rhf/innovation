-- Migration: add_work_schedule_rule_id
-- Description: Add workScheduleRuleId column to Employee table with FK to WorkScheduleRule

ALTER TABLE "Employee"
ADD COLUMN IF NOT EXISTS "workScheduleRuleId" UUID;

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_workScheduleRuleId_fkey"
FOREIGN KEY ("workScheduleRuleId")
REFERENCES "WorkScheduleRule"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;