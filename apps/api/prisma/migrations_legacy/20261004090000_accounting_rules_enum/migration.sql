-- Regras contábeis configuráveis: FGTS e parâmetros de folha passam a ser tabelas versionadas.
ALTER TYPE "PayrollTaxType" ADD VALUE IF NOT EXISTS 'FGTS';
ALTER TYPE "PayrollTaxType" ADD VALUE IF NOT EXISTS 'PAYROLL_PARAMS';
