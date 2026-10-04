-- CreateEnum
CREATE TYPE "ScheduleRequestType" AS ENUM ('TROCA_FOLGA', 'TROCA_TURNO', 'NOVA_ESCALA', 'AJUSTE_BATIDA', 'JUSTIFICATIVA', 'FOLGA_COMPENSACAO');

-- CreateEnum
CREATE TYPE "ScheduleRequestStatus" AS ENUM ('AWAITING_PEER', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PunchEvent" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "timeTrackId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "workDate" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'APP',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "address" TEXT,
    "geofenceId" UUID,
    "withinFence" BOOLEAN,
    "distanceMeters" INTEGER,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "justification" TEXT,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "receipt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PunchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 150,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimePunchPolicy" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "requireLocation" BOOLEAN NOT NULL DEFAULT true,
    "fencePolicy" TEXT NOT NULL DEFAULT 'FLAG',
    "maxAccuracyMeters" INTEGER NOT NULL DEFAULT 150,
    "minIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "maxPunchesPerDay" INTEGER NOT NULL DEFAULT 4,
    "earlyWindowMinutes" INTEGER NOT NULL DEFAULT 120,
    "lateWindowMinutes" INTEGER NOT NULL DEFAULT 360,
    "adjustmentDeadlineDays" INTEGER NOT NULL DEFAULT 5,
    "requireJustificationOutside" BOOLEAN NOT NULL DEFAULT true,
    "maxSpeedKmh" INTEGER NOT NULL DEFAULT 250,
    "updatedByUserId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimePunchPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRequest" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "requesterEmployeeId" UUID NOT NULL,
    "type" "ScheduleRequestType" NOT NULL,
    "status" "ScheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "reason" TEXT,
    "peerEmployeeId" UUID,
    "peerAcceptedAt" TIMESTAMP(3),
    "currentStep" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "decidedByUserId" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PunchEvent_companyId_employeeId_occurredAt_idx" ON "PunchEvent"("companyId", "employeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "PunchEvent_companyId_workDate_idx" ON "PunchEvent"("companyId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "PunchEvent_receipt_key" ON "PunchEvent"("receipt");

-- CreateIndex
CREATE INDEX "Geofence_companyId_idx" ON "Geofence"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TimePunchPolicy_companyId_key" ON "TimePunchPolicy"("companyId");

-- CreateIndex
CREATE INDEX "ScheduleRequest_companyId_status_idx" ON "ScheduleRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "ScheduleRequest_requesterEmployeeId_idx" ON "ScheduleRequest"("requesterEmployeeId");

-- CreateIndex
CREATE INDEX "ScheduleRequest_peerEmployeeId_idx" ON "ScheduleRequest"("peerEmployeeId");

-- AddForeignKey
ALTER TABLE "PunchEvent" ADD CONSTRAINT "PunchEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchEvent" ADD CONSTRAINT "PunchEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimePunchPolicy" ADD CONSTRAINT "TimePunchPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRequest" ADD CONSTRAINT "ScheduleRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRequest" ADD CONSTRAINT "ScheduleRequest_requesterEmployeeId_fkey" FOREIGN KEY ("requesterEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRequest" ADD CONSTRAINT "ScheduleRequest_peerEmployeeId_fkey" FOREIGN KEY ("peerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
