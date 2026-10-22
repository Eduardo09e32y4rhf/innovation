# scripts/archive

Tudo aqui foi **arquivado em 21/10/2026** (escopo L6 de `docs/ESCOPO-PRODUCAO-V1.md`). Nada foi apagado: o historico do git foi preservado (`git mv`). **Nao use estes scripts em producao.**

O unico caminho de deploy e `scripts/deploy/vps-update.sh` (chamado pelo `.github/workflows/deploy.yml`). Ver `scripts/README_SCRIPTS.md`.

| Pasta | Conteudo | Por que foi arquivado |
|---|---|---|
| `deploy-legacy/` | `deploy-prod.sh`, `deploy_rapido.sh`, `deploy_vps.ps1`, `deploy_k8s.ps1`, `vps-deploy-complete.sh`, `vps-final-deploy.sh`, `api-prod.sh`, `web-prod.sh`, `fast-prod.sh`, `full-prod.sh`, `deploy-prod-safe.sh`, `clean-docker-safe.sh` | 12 variantes concorrentes de deploy, nenhuma chamada por workflow, package.json ou docs vigentes. Pelo conteudo: 7 fazem `git reset --hard`, 8 apontam para caminhos fixos de VPS (`/var/www/...`), 2 derrubam a stack (`down`) e so 1 (`deploy-prod-safe.sh`) faz backup antes de mexer no banco |
| `migration-adhoc/` | `fix-migration-state.sql`, `fix-prod-migrations.sh`, `criar_tabelas_finance.sql`, `migrar_banco.sh` | Ajustes manuais pontuais de banco (apagam linhas de `_prisma_migrations`, criam tabelas fora das migrations, registram migrations como aplicadas). **Producao so recebe migrations versionadas**; correcao de estado de migration e decisao humana, caso a caso |
| `windows-local/` | `iniciar_local.*`, `run_*.ps1`, `bootstrap_local_stack.ps1`, `check_backend.ps1`, `start_frontend.ps1`, `update_whatsapp.bat` | Atalhos de Windows de uma fase anterior (citavam `INICIAR_INNOVATION.bat`, que nem existe). Desenvolvimento local = `docker compose up -d postgres redis` + `npm run dev:api` + `npm run dev:web` |
| `seeds-sql/` | `seed-plans.sql`, `seed-coupon-bemvindos.sql` | Substituidos por `npm run seed:pricing` / `apps/api/prisma/seed-plans-catalog.ts`; sem referencia |
| `tools/` | `ajuda.py`, `diagnostico_finance.sh`, `fix-auth.sh`, `innovation-enterprise-setup.ps1` | Diagnosticos e "fixes" avulsos, sem referencia |
| `misc/` | `apply_styles.py`, `test_browser.js`, `seed_notifications.py`, `serve-static.cjs`, `repair-portuguese-encoding.cjs`, `workspace-bootstrap.cjs` | Uso unico ou sem referencia |

Para restaurar um arquivo: `git mv scripts/archive/<pasta>/<arquivo> scripts/`. Antes de apagar de vez, confirme com o dono do projeto.
