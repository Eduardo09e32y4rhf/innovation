-- CreateTable
CREATE TABLE "TerminationRecord" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "noticeMode" TEXT,
    "terminationDate" DATE NOT NULL,
    "totalEarnings" DECIMAL(14,2) NOT NULL,
    "totalDiscounts" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "fgtsFine" DECIMAL(14,2) NOT NULL,
    "paymentDeadline" DATE NOT NULL,
    "snapshot" JSONB NOT NULL,
    "documentId" UUID,
    "sha256" TEXT,
    "finalizedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerminationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TerminationRecord_companyId_terminationDate_idx" ON "TerminationRecord"("companyId", "terminationDate");

-- CreateIndex
CREATE UNIQUE INDEX "TerminationRecord_employeeId_terminationDate_key" ON "TerminationRecord"("employeeId", "terminationDate");
