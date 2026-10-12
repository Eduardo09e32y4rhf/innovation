-- Catalogo de planos: Só RH, Básico e Completo. Idempotente (pode rodar mais de uma vez; atualiza por "code").
-- NAO desativa nem apaga nenhum plano existente (diferente do seed:pricing, que esconde todos os outros).
-- Uso:  docker compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < scripts/deploy/seed-plans.sql
-- Requer as migrations 20261006120000_plan_included_units aplicadas (coluna "includedUnits").
-- userMonthlyPrice = adicional por colaborador (Básico/Completo) ou por vaga (Só RH) acima do incluso.
BEGIN;

INSERT INTO "PlatformPlan"
  ("code","name","description","price","cycle","commitmentMonths","discountPercent","baseMonthlyPrice","userMonthlyPrice","includedUnits",
   "asaasCycle","displayOrder","isRecommended","pricingVersion","activeModules","isActive","isHidden","updatedAt")
VALUES
  ('RS','Só RH','Apenas Recrutamento e Seleção',99.99,'MONTHLY',1,0,99.99,2.49,50,
   'MONTHLY',1,false,'2026.2',ARRAY['recruitment'],true,false,now()),
  ('BASICO','Básico','RH completo para a sua equipe',99.99,'MONTHLY',1,0,99.99,2.50,10,
   'MONTHLY',2,false,'2026.2',ARRAY['employees','time-track','vacations','management'],true,false,now()),
  ('PREMIUM','Completo','RH completo + Recrutamento e Seleção',199.99,'MONTHLY',1,0,199.99,1.99,20,
   'MONTHLY',3,true,'2026.2',ARRAY['employees','time-track','vacations','management','recruitment'],true,false,now())
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "baseMonthlyPrice" = EXCLUDED."baseMonthlyPrice",
  "userMonthlyPrice" = EXCLUDED."userMonthlyPrice",
  "includedUnits" = EXCLUDED."includedUnits",
  "displayOrder" = EXCLUDED."displayOrder",
  "isRecommended" = EXCLUDED."isRecommended",
  "pricingVersion" = EXCLUDED."pricingVersion",
  "activeModules" = EXCLUDED."activeModules",
  "isActive" = true,
  "isHidden" = false,
  "updatedAt" = now();

COMMIT;

SELECT "code","name","baseMonthlyPrice","userMonthlyPrice","includedUnits","activeModules" FROM "PlatformPlan" WHERE "code" IN ('PREMIUM','RS','BASICO') ORDER BY "displayOrder";

