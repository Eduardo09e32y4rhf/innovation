-- Cupom de teste gratis de 30 dias (nao e desconto: so o periodo de teste). Idempotente: se o codigo ja existe, nao faz nada.
-- Pode ser editado, desativado ou excluido depois em Plataforma > Financeiro > Cupons (excluir so antes do primeiro uso).
INSERT INTO "PromotionCoupon" ("id", "code", "description", "trialDays", "type", "value", "durationCycles", "allowedPlanIds", "isActive", "redemptionCount", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '30DYAGRAT1S', 'Teste gratis de 30 dias', 30, 'TRIAL_DAYS', NULL, NULL, ARRAY[]::text[], true, 0, now(), now())
ON CONFLICT ("code") DO NOTHING;
