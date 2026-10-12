-- Catalogo de planos: Só RH, Básico e Completo. Idempotente (atualiza por "code").
-- ATENCAO: rodar de novo volta preco, itens e adicional ao padrao abaixo. Depois do primeiro uso, edite pela area de Planos do sistema.
-- NAO desativa nem apaga nenhum plano existente.
-- Uso:  docker compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < scripts/deploy/seed-plans.sql
-- Requer as migrations plan_included_units e plan_card_content aplicadas.
-- userMonthlyPrice = adicional por colaborador (Básico/Completo) ou por vaga (Só RH) acima do incluso.
BEGIN;

INSERT INTO "PlatformPlan"
  ("id","code","name","description","price","cycle","commitmentMonths","discountPercent","baseMonthlyPrice","userMonthlyPrice","includedUnits",
   "asaasCycle","displayOrder","isRecommended","pricingVersion","activeModules","isActive","isHidden","features","extraUnitLabel","updatedAt")
VALUES
  (gen_random_uuid(),'RS','Só RH','Apenas Recrutamento e Seleção',99.99,'MONTHLY',1,0,99.99,2.49,50,
   'MONTHLY',1,false,'2026.2',ARRAY['recruitment'],true,false,
   ARRAY['50 vagas por mês inclusas','Recrutamento completo','Portal de carreiras e funil de candidatos'],'vaga',now()),
  (gen_random_uuid(),'BASICO','Básico','RH completo para a sua equipe',99.99,'MONTHLY',1,0,99.99,2.50,10,
   'MONTHLY',2,false,'2026.2',ARRAY['employees','time-track','vacations','management'],true,false,
   ARRAY['10 colaboradores inclusos','11 acessos: 1 admin + 10 colaboradores','Escalas, férias e fechamento da equipe','Ponto por localização, com ajuste aprovado pelo gestor'],'colaborador',now()),
  (gen_random_uuid(),'PREMIUM','Completo','RH completo + Recrutamento e Seleção',199.99,'MONTHLY',1,0,199.99,1.99,20,
   'MONTHLY',3,true,'2026.2',ARRAY['employees','time-track','vacations','management','recruitment'],true,false,
   ARRAY['20 colaboradores inclusos','60 vagas por mês inclusas','Tudo do plano Básico','Recrutamento e Seleção completo'],'colaborador',now())
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
  "features" = EXCLUDED."features",
  "extraUnitLabel" = EXCLUDED."extraUnitLabel",
  "isActive" = true,
  "isHidden" = false,
  "updatedAt" = now();

COMMIT;

SELECT "code","name","price","baseMonthlyPrice","userMonthlyPrice","includedUnits","isHidden" FROM "PlatformPlan" ORDER BY "displayOrder";