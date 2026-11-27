ALTER TABLE "Job" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CandidateAccount" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- Somente os dois cargos de teste identificados no escopo, na empresa identificada.
UPDATE "Job" AS j SET "isTest" = true
FROM "Company" AS c WHERE j."companyId" = c.id
AND regexp_replace(lower(c.name), '[^a-z0-9]', '', 'g') = 'innovationsa'
AND lower(trim(j.title)) IN ('vendedor', 'desenvolvedor full stack');
-- Modalidade não é cidade. Preserva localizações reais.
UPDATE "Job" SET "workMode" = 'REMOTE', location = NULL
WHERE lower(trim(location)) IN ('remoto', 'remote', 'remoto · remoto')
AND ("workMode" IS NULL OR lower("workMode") IN ('remote', 'remoto'));
ALTER TABLE "CandidateAccount" ALTER COLUMN "xp" SET DEFAULT 0;
