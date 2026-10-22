-- =====================================================================================================
-- Limpeza de dados de TESTE em banco de DESENVOLVIMENTO ou STAGING. NUNCA rode em producao.
--
-- Por padrao e um ENSAIO: lista o que seria alterado e termina com ROLLBACK (nada muda).
-- A limpeza e REVERSIVEL (desativa/anonimiza, nao apaga linhas), como scripts/ops/purge-robo-qa.cjs:
-- apagar de verdade exige um script que conheca todas as chaves estrangeiras (134 tabelas) e deve ser feito
-- por quem administra o banco, depois de um backup.
--
-- Uso (psql). TODAS as variaveis sao obrigatorias; sem elas o script aborta antes de tocar em qualquer linha:
--
--   # ensaio (lista e faz rollback)
--   psql "$DATABASE_URL" -v prod_db=innovation_prod -v confirm=LIMPAR-DADOS-DE-TESTE \
--        -f scripts/dev/cleanup-test-data.sql
--
--   # aplicar (depois de um backup)
--   psql "$DATABASE_URL" -v prod_db=innovation_prod -v confirm=LIMPAR-DADOS-DE-TESTE -v apply=yes \
--        -f scripts/dev/cleanup-test-data.sql
--
--   prod_db  = nome do banco de PRODUCAO (o script recusa rodar se o banco conectado tiver esse nome)
--   confirm  = tem que ser exatamente LIMPAR-DADOS-DE-TESTE
--   apply    = yes para gravar (qualquer outro valor, ou ausente, faz ROLLBACK)
--   keep_seed_admins = (opcional, padrao yes) yes mantem dev@/admin@innovation.local, que o seed-admin cria
--                      e o staging costuma usar; no = tambem desativa esses usuarios
--
-- O que casa (criterio estreito; dado real nunca deve casar):
--   usuarios:     todos os usuarios das empresas abaixo, e e-mail qa-*@innovation.local, e2e*@*, funcionario@innovation.local, *@innovation.com (seeds de demo),
--                 robo-qa.*@example.com
--   empresas:     "Empresa Demo" (documento 00000000000191), "Empresa B" sem documento, nome ROBO-QA*
--   funcionarios: nome "Race Test*" (testes de concorrencia) ou com marcacao <script (testes de XSS)
-- =====================================================================================================
\set ON_ERROR_STOP on

\if :{?prod_db}
\else
  \echo 'ERRO: informe -v prod_db=<nome do banco de producao>. Nada foi alterado.'
  \quit
\endif
\if :{?confirm}
\else
  \echo 'ERRO: informe -v confirm=LIMPAR-DADOS-DE-TESTE. Nada foi alterado.'
  \quit
\endif
\if :{?apply}
\else
  \set apply no
\endif
\if :{?keep_seed_admins}
\else
  \set keep_seed_admins yes
\endif

SELECT set_config('cleanup.prod_db', :'prod_db', false),
       set_config('cleanup.confirm', :'confirm', false),
       set_config('cleanup.keep_seed_admins', :'keep_seed_admins', false);

BEGIN;

-- Trava 1 e 2: banco de producao e confirmacao. Qualquer falha aborta a transacao inteira.
DO $$
BEGIN
  IF current_database() = current_setting('cleanup.prod_db') THEN
    RAISE EXCEPTION 'ABORTADO: "%" e o banco de PRODUCAO. Este script e so para dev/staging.', current_database();
  END IF;
  IF current_setting('cleanup.confirm') <> 'LIMPAR-DADOS-DE-TESTE' THEN
    RAISE EXCEPTION 'ABORTADO: confirm deve ser exatamente LIMPAR-DADOS-DE-TESTE.';
  END IF;
  RAISE NOTICE 'Banco: % (nao e o de producao informado: %)', current_database(), current_setting('cleanup.prod_db');
END $$;

-- Alvos
CREATE TEMP TABLE _alvo_empresas ON COMMIT DROP AS
SELECT c.id, c.name, c.document, c.status::text AS status
FROM "Company" c
WHERE c.status <> 'CANCELLED'
  AND (
       c.document = '00000000000191'
    OR (c.name = 'Empresa B' AND (c.document IS NULL OR c.document = ''))
    OR c.name ILIKE 'ROBO-QA%'
  );

CREATE TEMP TABLE _alvo_usuarios ON COMMIT DROP AS
SELECT u.id, u.email, u.role::text AS role
FROM "User" u
WHERE u."isActive" = true
  AND (
       lower(u.email) LIKE 'qa-%@innovation.local'
    OR lower(u.email) LIKE 'e2e%@%'
    OR lower(u.email) = 'funcionario@innovation.local'
    OR lower(u.email) LIKE '%@innovation.com'
    OR lower(u.email) LIKE 'robo-qa.%@example.com'
    OR (current_setting('cleanup.keep_seed_admins') = 'no' AND lower(u.email) IN ('dev@innovation.local', 'admin@innovation.local'))
    -- todos os usuarios de uma empresa-alvo (exceto os admins do seed quando keep_seed_admins=yes)
    OR (u."companyId" IN (SELECT id FROM _alvo_empresas)
        AND NOT (current_setting('cleanup.keep_seed_admins') = 'yes' AND lower(u.email) IN ('dev@innovation.local', 'admin@innovation.local')))
  );

CREATE TEMP TABLE _alvo_funcionarios ON COMMIT DROP AS
SELECT e.id, e.name, e.status::text AS status
FROM "Employee" e
WHERE e.status <> 'TERMINATED'
  AND (e.name ILIKE 'Race Test%' OR e.name ILIKE '%<script%');

\echo
\echo '=== Ensaio: o que sera alterado ==='
SELECT 'usuarios' AS tipo, count(*) AS qtd FROM _alvo_usuarios
UNION ALL SELECT 'empresas', count(*) FROM _alvo_empresas
UNION ALL SELECT 'funcionarios', count(*) FROM _alvo_funcionarios;
SELECT 'USUARIO' AS tipo, email AS item, role AS detalhe FROM _alvo_usuarios ORDER BY email;
SELECT 'EMPRESA' AS tipo, name AS item, coalesce(document, 'sem documento') AS detalhe FROM _alvo_empresas ORDER BY name;
SELECT 'FUNCIONARIO' AS tipo, left(name, 60) AS item, status AS detalhe FROM _alvo_funcionarios ORDER BY name;

-- Acoes REVERSIVEIS (nada e apagado)
UPDATE "User" u
   SET "isActive" = false,
       email = 'removido+' || u.id::text || '@invalid.local'
 WHERE u.id IN (SELECT id FROM _alvo_usuarios);

UPDATE "Company" c
   SET status = 'CANCELLED', "isActive" = false, "billingStatus" = 'CANCELED',
       "suspensionReason" = 'Dados de teste desativados por cleanup-test-data.sql'
 WHERE c.id IN (SELECT id FROM _alvo_empresas);

UPDATE "Employee" e
   SET status = 'TERMINATED', "terminationDate" = coalesce(e."terminationDate", now())
 WHERE e.id IN (SELECT id FROM _alvo_funcionarios);

-- Trava 3: so grava com apply=yes
\if :{?apply}
\else
  \set apply no
\endif
SELECT (:'apply' = 'yes') AS gravar \gset
\if :gravar
  \echo
  \echo '>>> apply=yes: COMMIT (alteracoes gravadas).'
  COMMIT;
\else
  \echo
  \echo '>>> ENSAIO: ROLLBACK. Nada foi gravado. Para aplicar, repita com -v apply=yes (depois de um backup).'
  ROLLBACK;
\endif
