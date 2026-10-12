-- Escritorio de contabilidade: clientes, tarefas, checklist mensal, cobranca de documentos e honorarios
CREATE TABLE "AccountingClient" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "taxRegime" TEXT NOT NULL DEFAULT 'SIMPLES',
    "responsibleId" UUID,
    "monthlyFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "feeDueDay" INTEGER NOT NULL DEFAULT 10,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT NOT NULL DEFAULT 'DP',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "assigneeId" UUID,
    "createdById" UUID NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingChecklistItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" UUID,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingDocRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'OUTROS',
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "lastReminderAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingDocRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingFee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingFee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingClient_companyId_key" ON "AccountingClient"("companyId");
CREATE INDEX "AccountingTask_status_dueDate_idx" ON "AccountingTask"("status", "dueDate");
CREATE INDEX "AccountingTask_companyId_idx" ON "AccountingTask"("companyId");
CREATE INDEX "AccountingTask_assigneeId_idx" ON "AccountingTask"("assigneeId");
CREATE UNIQUE INDEX "AccountingChecklistItem_companyId_month_itemKey_key" ON "AccountingChecklistItem"("companyId", "month", "itemKey");
CREATE INDEX "AccountingChecklistItem_month_idx" ON "AccountingChecklistItem"("month");
CREATE INDEX "AccountingDocRequest_companyId_month_idx" ON "AccountingDocRequest"("companyId", "month");
CREATE INDEX "AccountingDocRequest_status_idx" ON "AccountingDocRequest"("status");
CREATE UNIQUE INDEX "AccountingFee_companyId_month_key" ON "AccountingFee"("companyId", "month");
CREATE INDEX "AccountingFee_status_dueDate_idx" ON "AccountingFee"("status", "dueDate");
