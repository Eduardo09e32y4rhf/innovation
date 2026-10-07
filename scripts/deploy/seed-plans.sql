-- Catalogo de planos: Premium, R&S e Basico. Idempotente (pode rodar mais de uma vez; atualiza por "code").
-- NAO desativa nem apaga nenhum plano existente (diferente do seed:pricing, que esconde todos os outros).
-- Uso:  docker compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < scripts/deploy/seed-plans.sql
-- Requer as migrations 20261006120000_plan_included_units aplicadas (coluna "includedUnits").
BEGIN;

INSERT INTO "PlatformPlan"
  ("code","name","description","price","cycle","commitmentMonths","discountPercent","baseMonthlyPrice","userMonthlyPrice","includedUnits",
   "asaasCycle","displayOrder","isRecommended","pricingVersion","activeModules","isActive","isHidden","updatedAt")
VALUES
  ('PREMIUM','Premium','Completo: todas as abas, 10 usuarios inclusos',199.99,'MONTHLY',1,0,199.99,2,10,
   'MONTHLY',1,true,'2026.2',ARRAY['employees','time-track','vacations','management','recruitment'],true,false,now()),
  ('RS','R&S','Recrutamento e Selecao: aba Vagas, ate 50 vagas/mes',99.99,'MONTHLY',1,0,99.99,2,50,
   'MONTHLY',2,false,'2026.2',ARRAY['recruitment'],true,false,now()),
  ('BASICO','Basico','Todas as abas, exceto Vagas',99.99,'MONTHLY',1,0,99.99,2,10,
   'MONTHLY',3,false,'2026.2',ARRAY['employees','time-track','vacations','management'],true,false,now())
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
