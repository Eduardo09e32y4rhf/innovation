-- Migration: Add Management and ASO tables
-- Fix: UUID columns for FK compatibility

DROP TABLE IF EXISTS "employee_aso_records" CASCADE;
DROP TABLE IF EXISTS "management_events" CASCADE;

CREATE TABLE "management_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "responsibleUserId" UUID,
    "employeeId" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "management_events_companyId_idx" ON "management_events"("companyId");
CREATE INDEX "management_events_employeeId_idx" ON "management_events"("employeeId");
CREATE INDEX "management_events_startDateTime_idx" ON "management_events"("startDateTime");
CREATE INDEX "management_events_companyId_status_idx" ON "management_events"("companyId", "status");

ALTER TABLE "management_events" ADD CONSTRAINT "management_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_events" ADD CONSTRAINT "management_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "employee_aso_records" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "asoType" TEXT NOT NULL,
    "examDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "clinicName" TEXT,
    "doctorName" TEXT,
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_aso_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_aso_records_companyId_idx" ON "employee_aso_records"("companyId");
CREATE INDEX "employee_aso_records_employeeId_idx" ON "employee_aso_records"("employeeId");
CREATE INDEX "employee_aso_records_asoType_idx" ON "employee_aso_records"("asoType");
CREATE INDEX "employee_aso_records_expirationDate_idx" ON "employee_aso_records"("expirationDate");

ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;