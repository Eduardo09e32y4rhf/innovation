# Deploy na VPS

Fluxo único e seguro (não editar o compose para colocar segredos):

```bash
cd /var/www/innovation
bash scripts/security/bootstrap-env.sh https://seu-dominio.com.br   # 1ª vez: gera segredos fortes no .env
bash scripts/security/rotate-db-password.sh                         # 1ª vez: troca a senha do Postgres existente
bash scripts/backup/install-cron.sh                                 # 1ª vez: backup diário + teste semanal de restauração
bash scripts/deploy/vps-update.sh                                   # toda atualização
```

`vps-update.sh` faz: pull → backup → migrations pendentes → build/subida → verificação de saúde (e mostra o rollback se falhar).

## Regras
- Segredos só no `.env` da VPS (permissão 600). Nunca no repositório, no compose ou em chat.
- Em produção a API **recusa subir** com segredo fraco/ausente (veja `apps/api/src/config/env.validation.ts`).
- Postgres e Redis não ficam expostos; API e web escutam só em `127.0.0.1` (o proxy reverso do servidor faz a ponte).
- Cópia externa do backup: defina `BACKUP_REMOTE` (rclone). Sem isso o script avisa que só há cópia local.
- Pagamentos: preencha `ASAAS_*` e/ou `MERCADOPAGO_*` no `.env`; confira em `GET /api/finance/integrations/health?test=1`.

## Rotação de segredos
1. Edite o valor no `.env` (ou apague a linha e rode o bootstrap).
2. `JWT_SECRET`: derruba todas as sessões (esperado). `KMS_MASTER_KEY`: senhas provisórias já emitidas deixam de poder ser exibidas (gere outra).
3. `POSTGRES_PASSWORD`: rode `rotate-db-password.sh` antes de recriar a stack.
## Deploy automatico (GitHub Actions)
Fluxo: merge na `main` -> CI (`ci.yml`) -> **staging** (automatico) -> **producao** (um clique de aprovacao).

Configuracao unica no GitHub (Settings):
1. **Environments**: crie `staging` e `production`; em `production` marque *Required reviewers* (e o clique).
2. **Secrets** (por environment): `STAGING_HOST/USER/SSH_KEY` e `PROD_HOST/USER/SSH_KEY`. **Variables**: `STAGING_URL`, `PROD_URL`, opcional `STAGING_DIR`, `PROD_DIR`.
3. **Branch protection** da `main`: exigir PR, exigir o check `ci-ok`, bloquear push direto.
4. Staging = segunda VPS (ou subdominio na mesma VPS com outro diretorio, outro `.env` e outras portas), mesmo `docker-compose.prod.yml`.

## Versoes e changelog
`git tag v1.2.0 && git push --tags` -> `release.yml` publica a Release com changelog gerado dos PRs.

## Rollback
- GitHub: Actions -> **Rollback producao** -> informe a tag/SHA anterior (marque `restore_db` so se uma migration corrompeu dados).
- Na VPS: `bash scripts/deploy/rollback.sh v1.2.0 [--restore-db]`.
- Migrations sao aditivas; o backup automatico antes de cada deploy fica em `storage/backups/`.

## Migrations
- `apps/api/prisma/migrations/*_baseline` = schema completo atual (gerado por `prisma migrate diff --from-empty`); bancos novos (CI, staging) nascem dele via `prisma migrate deploy` ou `apply-migrations.sh`.
- O historico antigo ficou em `apps/api/prisma/migrations_legacy/` (nao usado). Producao nao muda: `apply-migrations.sh` ignora o baseline e aplica so o que vier depois.
- Nova migration: `npm --prefix apps/api run prisma:migrate:dev -- --name descricao` (nome com timestamp, sempre aditiva).

## Monitoramento
- **Metricas/alertas:** defina `METRICS_TOKEN` no `.env` (sem ele `/metrics` responde 404) e grave o mesmo valor em `infra/metrics_token` para o Prometheus. Regras em `infra/alerts.yml`: API fora, 5xx, webhook falhando, cron parado (backup/cobranca), pico de login recusado. Para receber os avisos, grave a URL do webhook (Slack/Discord/ntfy) em `infra/webhook_url`; o Alertmanager (`infra/alertmanager.yml`) ja esta no compose de monitoramento.
- **Uptime:** crie um monitor externo gratuito (UptimeRobot/Better Stack) em `https://SEU-DOMINIO/api/health`, intervalo de 1 min.
- **Sentry:** crie o projeto e preencha `SENTRY_DSN` no `.env`; a API ja envia erros 500 (com `requestId`) quando o DSN existe. Opcionais: `SENTRY_ENV`, `APP_VERSION`, `SENTRY_TRACES_SAMPLE_RATE`.
