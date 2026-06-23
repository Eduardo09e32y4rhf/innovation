-- Add comprehensive indexes for scalability
-- These indexes optimize the most frequent queries

-- User indexes
CREATE INDEX IF NOT EXISTS "User_companyId_idx" ON "User" ("companyId");
-- email already has unique index

-- Employee indexes
-- companyId already indexed
CREATE INDEX IF NOT EXISTS "Employee_companyId_managerId_idx" ON "Employee" ("companyId", "managerId");
CREATE INDEX IF NOT EXISTS "Employee_companyId_status_idx" ON "Employee" ("companyId", "status");
-- cpf already has unique index

-- TimeTrack indexes
-- employeeId already indexed
-- employeeId_date already has unique constraint
CREATE INDEX IF NOT EXISTS "TimeTrack_date_idx" ON "TimeTrack" ("date");
CREATE INDEX IF NOT EXISTS "TimeTrack_manualStatus_idx" ON "TimeTrack" ("manualStatus");
CREATE INDEX IF NOT EXISTS "TimeTrack_employeeId_date_idx" ON "TimeTrack" ("employeeId", "date");

-- Vacation indexes
-- employeeId already indexed
CREATE INDEX IF NOT EXISTS "Vacation_status_idx" ON "Vacation" ("status");
CREATE INDEX IF NOT EXISTS "Vacation_employeeId_status_idx" ON "Vacation" ("employeeId", "status");