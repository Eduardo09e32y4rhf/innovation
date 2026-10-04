-- Migration: Add Management and ASO tables (corrigida)
-- Usa nomes de tabelas corretas (minúsculas) e tipos UUID

CREATE TABLE IF NOT EXISTS "management_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "startDateTime" TIMESTAMP NOT NULL,
    "endDateTime" TIMESTAMP,
    "responsibleUserId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "employeeId" UUID REFERENCES "employees"("id") ON DELETE SET NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "management_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "management_events_companyId_idx" ON "management_events"("companyId");
CREATE INDEX IF NOT EXISTS "management_events_employeeId_idx" ON "management_events"("employeeId");
CREATE INDEX IF NOT EXISTS "management_events_startDateTime_idx" ON "management_events"("startDateTime");
CREATE INDEX IF NOT EXISTS "management_events_companyId_status_idx" ON "management_events"("companyId", "status");

CREATE TABLE IF NOT EXISTS "employee_aso_records" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "employeeId" UUID NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "asoType" TEXT NOT NULL,
    "examDate" TIMESTAMP,
    "expirationDate" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "clinicName" TEXT,
    "doctorName" TEXT,
    "documentNumber" TEXT,
    "notes" TEXT,
    "attachmentId" TEXT,
    "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_aso_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_aso_records_companyId_idx" ON "employee_aso_records"("companyId");
CREATE INDEX IF NOT EXISTS "employee_aso_records_employeeId_idx" ON "employee_aso_records"("employeeId");
CREATE INDEX IF NOT EXISTS "employee_aso_records_asoType_idx" ON "employee_aso_records"("asoType");
CREATE INDEX IF NOT EXISTS "employee_aso_records_expirationDate_idx" ON "employee_aso_records"("expirationDate");
