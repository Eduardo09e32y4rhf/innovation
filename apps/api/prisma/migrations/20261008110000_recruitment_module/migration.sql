-- Modulo canonico de recrutamento: chave "recruitment" em activeModules (mesma usada no site de precos).
-- Vagas ja existia sem controle de modulo; para nao desabilitar clientes atuais, a chave e concedida
-- explicitamente a todas as empresas e planos existentes, com registro de auditoria por empresa.
INSERT INTO "AuditLog" ("id", "companyId", "action", "entity", "entityId", "metadata")
SELECT gen_random_uuid(), c."id", 'MODULE_GRANTED_BY_MIGRATION', 'Company', c."id"::text,
       jsonb_build_object('module', 'recruitment', 'migration', '20261008110000_recruitment_module', 'reason', 'preservar acesso existente a Vagas')
FROM "Company" c
WHERE NOT ('recruitment' = ANY (c."activeModules"));

UPDATE "Company" SET "activeModules" = array_append("activeModules", 'recruitment')
WHERE NOT ('recruitment' = ANY ("activeModules"));

UPDATE "PlatformPlan" SET "activeModules" = array_append("activeModules", 'recruitment')
WHERE NOT ('recruitment' = ANY ("activeModules"));

ALTER TABLE "Company" ALTER COLUMN "activeModules" SET DEFAULT ARRAY['employees', 'time-track', 'vacations', 'management', 'recruitment']::TEXT[];