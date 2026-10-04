-- Downgrade de plano agendado para o proximo ciclo
ALTER TABLE "CompanySubscription" ADD COLUMN "pendingPlanId" UUID;
