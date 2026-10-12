-- Conteudo do card de venda do plano (linhas e unidade do adicional), editavel na area de planos
ALTER TABLE "PlatformPlan" ADD COLUMN "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "extraUnitLabel" TEXT NOT NULL DEFAULT 'colaborador';
