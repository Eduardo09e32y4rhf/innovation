# Scripts

Um caminho para cada tarefa. O que nao esta aqui foi para `scripts/archive/` (ver `archive/README.md`).

## Desenvolvimento local
```bash
docker compose up -d postgres redis          # banco e cache (docker-compose.yml)
npm install && npm run db:generate && npm run db:deploy && npm run db:seed
npm run dev:api                              # API em :3333
npm run dev:web                              # Web em :3000
```
Testes: `npm run test:all` (unitarios, integracao, contrato e seguranca; `tests/qa` esta incluido nos unitarios). Banco de teste: `npm run test:db:setup | test:db:reset | test:db:seed` (`scripts/test/`).

## Deploy (VPS) — caminho unico
`merge na main -> CI -> staging (automatico) -> producao (aprovacao)` via `.github/workflows/deploy.yml`, que roda na VPS:
```bash
bash scripts/deploy/vps-update-bg.sh [branch|tag|sha]   # igual ao vps-update.sh, mas em segundo plano (sobrevive a queda do terminal); log em storage/deploy-*.log
bash scripts/deploy/vps-update.sh [branch|tag|sha]   # codigo -> backup -> migrations -> build/subida -> verificacao de saude
bash scripts/deploy/rollback.sh <tag|sha> [--restore-db]
```
Primeira vez na VPS: `scripts/security/bootstrap-env.sh`, `scripts/security/rotate-db-password.sh`, `scripts/backup/install-cron.sh`. Detalhes em `docs/DEPLOY-VPS.md`.

## Migrations em producao
- Hoje: `vps-update.sh` chama `scripts/deploy/apply-migrations.sh` (aplicador manual por `psql`, tabela `_manual_migrations`).
- Alvo: `prisma migrate deploy` (`scripts/deploy/migrate-prisma.sh`). Para trocar, o banco de producao precisa ser baselined no Prisma e o ensaio deve ser feito numa **copia** do banco. Ate la, nao use outros scripts de migration.
- **Proibido** em producao: SQL avulso, apagar linhas de `_prisma_migrations`, criar tabelas fora de migration (os antigos estao em `archive/migration-adhoc/`).

## Backup
`scripts/backup/`: `backup.sh` (diario, chamado pelo deploy), `install-cron.sh`, `postgres-backup.sh`, `postgres-restore.sh`, `restore-test.sh` (teste de restauracao).

## Outros
| Arquivo | Uso |
|---|---|
| `workspace-foundation-check.cjs` | `npm run check:workspace` (CI) |
| `check-official-pdfs.mjs` | `npm run check:official-pdfs` |
| `block_secrets.py` | hook do `.pre-commit-config.yaml` |
| `ops/purge-robo-qa.cjs` | lista/desativa empresas e usuarios "ROBO-QA" que o robo de QA deixou em bancos existentes (dry-run por padrao) |
| `dev/mvp-api-smoke.cjs` | fumaca manual contra uma API no ar (`API_BASE_URL=...`) |
| `dev/cleanup-test-data.sql` | limpeza reversivel de dados de teste, SO dev/staging (ensaio por padrao; ver `docs/auditoria/SEEDS-E-DADOS-DE-TESTE-2026-10-21.md`) |
| `dev/count-any.py` | conta `any` (item L7, `docs/DIVIDA-DE-TIPOS.md`) |
