-- Adicionar suspensionReason no Employee
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;

-- Adicionar campos de ocorrência no TimeTrack
ALTER TABLE "TimeTrack" ADD COLUMN IF NOT EXISTS "incidentType" TEXT;
ALTER TABLE "TimeTrack" ADD COLUMN IF NOT EXISTS "toleranceMinutes" INTEGER;
ALTER TABLE "TimeTrack" ADD COLUMN IF NOT EXISTS "absenceMinutes" INTEGER;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS "TimeTrack_incidentType_idx" ON "TimeTrack"("incidentType");
CREATE INDEX IF NOT EXISTS "TimeTrack_employeeId_date_idx" ON "TimeTrack"("employeeId", "date");