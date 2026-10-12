-- Dispensa de controle de ponto (art. 62) e ciencia do funcionario sobre o espelho do mes
ALTER TABLE "Employee" ADD COLUMN "timeControlExempt" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TimesheetAck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "contentHash" TEXT NOT NULL,
    "sentById" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedAt" TIMESTAMP(3),
    "signedIp" TEXT,
    "contestation" TEXT,
    CONSTRAINT "TimesheetAck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TimesheetAck_employeeId_month_key" ON "TimesheetAck"("employeeId", "month");
CREATE INDEX "TimesheetAck_companyId_month_idx" ON "TimesheetAck"("companyId", "month");
