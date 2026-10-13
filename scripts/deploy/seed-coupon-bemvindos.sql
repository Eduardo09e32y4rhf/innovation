-- Cupom BEMVINDOS: 10 dias gratis em QUALQUER plano, uma unica vez por CPF/CNPJ.
-- Regras (ja no sistema): aviso ao administrador no 9o dia (continuar ou recusar); no 10o dia a cobranca sai sozinha pelo Asaas
-- e aparece na aba Faturas; quem recusa tem o acesso bloqueado e nada e cobrado. O documento nunca mais usa o cupom.
-- Idempotente: pode rodar de novo (nao zera os usos ja feitos).
-- Uso:  docker compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < scripts/deploy/seed-coupon-bemvindos.sql
BEGIN;

INSERT INTO "PromotionCoupon" ("id","code","description","trialDays","type","allowedPlanIds","isActive","updatedAt")
VALUES (gen_random_uuid(),'BEMVINDOS','10 dias gratis em qualquer plano (uma vez por CPF/CNPJ)',10,'TRIAL_DAYS',ARRAY[]::TEXT[],true,now())
ON CONFLICT ("code") DO UPDATE SET
  "description" = EXCLUDED."description",
  "trialDays" = 10,
  "type" = 'TRIAL_DAYS',
  "allowedPlanIds" = ARRAY[]::TEXT[],
  "minSeats" = NULL,
  "maxRedemptions" = NULL,
  "startsAt" = NULL,
  "expiresAt" = NULL,
  "isActive" = true,
  "updatedAt" = now();

COMMIT;

SELECT "code","type","trialDays","isActive","redemptionCount","maxRedemptions" FROM "PromotionCoupon" WHERE "code" = 'BEMVINDOS';