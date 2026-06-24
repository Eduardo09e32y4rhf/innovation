-- CreateTable
CREATE TABLE "management_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "responsibleUserId" TEXT,
    "employeeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "management_events_companyId_idx" ON "management_events"("companyId");

-- CreateIndex
CREATE INDEX "management_events_employeeId_idx" ON "management_events"("employeeId");

-- CreateIndex
CREATE INDEX "management_events_startDateTime_idx" ON "management_events"("startDateTime");

-- CreateIndex
CREATE INDEX "management_events_companyId_status_idx" ON "management_events"("companyId", "status");

-- AddForeignKey
ALTER TABLE "management_events" ADD CONSTRAINT "management_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_events" ADD CONSTRAINT "management_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "employee_aso_records" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "asoType" TEXT NOT NULL,
    "examDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "clinicName" TEXT,
    "doctorName" TEXT,
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_aso_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_aso_records_companyId_idx" ON "employee_aso_records"("companyId");

-- CreateIndex
CREATE INDEX "employee_aso_records_employeeId_idx" ON "employee_aso_records"("employeeId");

-- CreateIndex
CREATE INDEX "employee_aso_records_asoType_idx" ON "employee_aso_records"("asoType");

-- CreateIndex
CREATE INDEX "employee_aso_records_expirationDate_idx" ON "employee_aso_records"("expirationDate");

-- AddForeignKey
ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;