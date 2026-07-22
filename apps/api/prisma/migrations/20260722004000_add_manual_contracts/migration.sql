CREATE TABLE "ManualContract" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "planId" UUID,
  "seatQuantity" INTEGER NOT NULL,
  "agreedAmount" DECIMAL(10,2) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "paymentMethod" TEXT NOT NULL,
  "externalContractNumber" TEXT,
  "notes" TEXT NOT NULL,
  "documentUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualContract_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ManualContract_companyId_status_idx" ON "ManualContract"("companyId", "status");
CREATE INDEX "ManualContract_startsAt_endsAt_idx" ON "ManualContract"("startsAt", "endsAt");
CREATE INDEX "ManualContract_createdBy_idx" ON "ManualContract"("createdBy");
ALTER TABLE "ManualContract" ADD CONSTRAINT "ManualContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualContract" ADD CONSTRAINT "ManualContract_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
