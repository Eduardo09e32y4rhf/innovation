-- Politica de hora extra da empresa: PAYMENT (paga na folha) ou BANK (banco de horas com validade em meses)
ALTER TABLE "OvertimeRule" ADD COLUMN "overtimePolicy" TEXT NOT NULL DEFAULT 'PAYMENT';
ALTER TABLE "OvertimeRule" ADD COLUMN "bankValidityMonths" INTEGER NOT NULL DEFAULT 3;
