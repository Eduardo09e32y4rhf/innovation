# Deploy na VPS

Fluxo único e seguro (não editar o compose para colocar segredos):

```bash
cd /var/www/innovation
bash scripts/security/bootstrap-env.sh https://seu-dominio.com.br   # 1ª vez: gera segredos fortes no .env
bash scripts/security/rotate-db-password.sh                         # 1ª vez: troca a senha do Postgres existente
bash scripts/backup/install-cron.sh                                 # 1ª vez: backup diário + teste semanal de restauração
bash scripts/deploy/vps-update-bg.sh                                # toda atualização (em segundo plano; sobrevive à queda do terminal)
tail -f storage/deploy-*.log                                        # acompanhar (Ctrl+C sai sem parar o deploy)
```

`vps-update.sh` faz (o `vps-update-bg.sh` apenas o executa desligado do terminal, que no painel/celular costuma cair durante o build): pull → backup → migrations pendentes → build/subida → verificação de saúde (e mostra o rollback se falhar).

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

## Mercado Pago: assinatura recorrente
- Com `PAYMENT_PROVIDER=mercadopago`, o cadastro cria uma **assinatura mensal** (preapproval) e devolve o link do checkout hospedado; o cartao e informado na pagina do Mercado Pago.
- No painel do Mercado Pago (Webhooks) marque os topicos **Pagamentos**, **Planos e assinaturas** (`subscription_preapproval`) e **Pagamento recorrente** (`subscription_authorized_payment`), todos para `https://SEU-DOMINIO/api/finance/webhook/mercadopago`.
- `APP_URL` precisa estar definido (usado em `back_url`). Aplique a migration `20261006110000_mp_subscription` (`apply-migrations.sh`).
- Cobranca recusada pelo cartao: a fatura fica aberta/vencida e a regua de inadimplencia (`DUNNING_*`) bloqueia e cancela; ao pagar, o webhook reativa.
- Ainda falta: trocar o valor da assinatura ao mudar plano/usuarios (`updateSubscriptionAmount` ja existe no servico, falta ligar) e cancelar a assinatura ao cancelar a empresa.

## Desempenho (VPS pequena)
O que ja vem configurado no `docker-compose.prod.yml` (todos os valores sao sobrescritiveis no `.env`):

| Servico | Limite (padrao) | Variaveis |
|---|---|---|
| db (Postgres) | 1 GB; `shared_buffers=256MB`, `work_mem=8MB`, `max_connections=60` | `DB_MEM_LIMIT`, `PG_SHARED_BUFFERS`, `PG_EFFECTIVE_CACHE_SIZE`, `PG_WORK_MEM`, `PG_MAX_CONNECTIONS` |
| redis | 384 MB | `REDIS_MEM_LIMIT` |
| api | 1 GB; `NODE_OPTIONS=--max-old-space-size=640` | `API_MEM_LIMIT`, `API_NODE_OPTIONS` |
| web | 640 MB; `NODE_OPTIONS=--max-old-space-size=384` | `WEB_MEM_LIMIT`, `WEB_NODE_OPTIONS` |
| clamav | 2 GB | `CLAMAV_MEM_LIMIT` |

Soma dos limites padrao: ~5 GB. Em VPS com menos RAM, reduza `PG_*`/limites proporcionalmente; o heap do Node deve ficar ~60-65% do `mem_limit` do container.

### nginx do host
Copie as diretivas de `infra/nginx-host-performance.conf` (gzip, keepalive para os containers, cache imutavel de `/_next/static/`). Depois `sudo nginx -t && sudo systemctl reload nginx`. O Next ja serve `/_next/static` como imutavel e agora os arquivos de `public/` (logo, fontes, imagens) deixaram de receber `no-store`; so as paginas continuam sem cache.

### ClamAV (antivirus de anexos)
Consome ~1-1,5 GB de RAM fixos (carrega o banco de assinaturas) e e o maior ofensor de memoria da stack. **Nao foi desligado**: em producao a API recusa curriculos/anexos de suporte com 503 quando o scanner nao responde (`candidate-document-scanner.service.ts`). Se a VPS tiver pouca RAM e voce aceitar ficar sem upload de anexos/curriculos, pare so o scanner: `docker compose -f docker-compose.prod.yml stop clamav`. Para voltar: `start clamav` (a primeira subida baixa as definicoes). Nao reduza `CLAMAV_MEM_LIMIT` abaixo de 1,5g (OOM em loop). Alternativa que mantem a verificacao: scanner em outra maquina e `CLAMAV_HOST` apontando para ela.

### Migration de indices
`20261022190000_performance_indexes` e aditiva (`CREATE INDEX IF NOT EXISTS`); `apply-migrations.sh` aplica no proximo deploy. Em tabelas grandes o Postgres bloqueia escritas durante a criacao: aplique fora do horario de pico.

### O que medir na VPS (antes e depois)
```bash
free -h && swapon --show                       # RAM livre e se esta usando swap (swap alto = causa provavel da lentidao)
docker stats --no-stream                       # CPU/RAM por container; veja quem encosta no limite
uptime; nproc                                  # load average vs nucleos
docker compose -f docker-compose.prod.yml logs --since 10m api | grep -i "oom\|heap\|killed"
dmesg -T | grep -i "out of memory"             # OOM killer do kernel
docker compose -f docker-compose.prod.yml exec db psql -U innovation -d innovation_db -c "SELECT calls, round(mean_exec_time::numeric,1) AS ms, left(query,90) FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 15;"   # exige a extensao pg_stat_statements
curl -s -o /dev/null -w 'ttfb=%{time_starttransfer}s total=%{time_total}s\n' https://SEU-DOMINIO/api/health
curl -sI https://SEU-DOMINIO/_next/static/ | head   # confira Cache-Control imutavel apos aplicar o nginx
```

### Cabecalhos de seguranca: NAO duplicar no nginx
O Next ja envia (em `apps/web/next.config.js`, `headers()`): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (so em producao), `Content-Security-Policy` e `Content-Security-Policy-Report-Only`. No bloco `location /` que faz proxy para o web **nao** use `add_header` para nenhum deles (cabecalho repetido chega duplicado ao navegador) nem `proxy_hide_header` para esconde-los. Se preferir HSTS no nginx, deixe-o somente la e remova do Next. `add_header Cache-Control` so em `/_next/static/`, como ja documentado. Conferir: `curl -sI https://SEU-DOMINIO/login | grep -ci '^strict-transport-security'` deve imprimir 1.

## Contêineres, ordem de subida e legado (INF-07, INF-08, INF-09)
- **Imagens**: API e web são multi-stage, rodam como usuário `node` (não root) e têm `HEALTHCHECK` (`/health/live` na 3333; `/` na 3000). A porta 3333 e o comando `node apps/api/dist/main.js` não mudaram. As dependências de desenvolvimento saem com `npm prune --omit=dev` depois de `prisma generate` e do build (o CLI do Prisma é devDependency; por isso o drift usa `npx`, abaixo).
- **Volume `api_data`**: o volume antigo pertence ao root. O `vps-update.sh` roda, antes de subir a API, um `chown -R node:node /data` idempotente (`--user root`). Conferir: `docker compose -f docker-compose.prod.yml exec api sh -c 'id -u; ls -ld /data /data/*'` (uid diferente de 0; `/data` do `node`).
- **Ordem**: `web` espera a API saudável (`depends_on: condition: service_healthy`). O ClamAV tem `healthcheck` (`clamdcheck.sh`, `start_period` 180 s), mas a API **não** depende dele: se o ClamAV demorar, a API sobe e envio de currículo/anexo falha fechado (503) até ele ficar `healthy`. Conferir: `docker compose -f docker-compose.prod.yml ps`.
- **Legado**: a produção é só `docker-compose.prod.yml`. O que era legado/inseguro em `infra/` (compose com watchtower e `docker.sock`, Dockerfiles do nginx, render.yaml com seed, Caddyfile, etc.) foi para `docs/legado/infra/` (ver README lá). O `docker-compose.yml` da raiz é só desenvolvimento, com portas em 127.0.0.1. Conferir na VPS: `ss -ltn` deve mostrar só 22/80/443 em endereço público.

## nginx de referência (INF-10)
`infra/nginx-innovation.conf` é uma **referência** (TLS 1.2/1.3, limites, timeouts, `client_max_body_size 20m`, `limit_req` em `/api/auth/` e `/api/public/`, `/api/metrics` e `/api/health` completo bloqueados, webhooks sem limite, cache imutável só em `/_next/static/`). **Não afirma que o nginx real da VPS é assim.** A API não tem prefixo `/api`: o nginx o remove com `rewrite`, então `/api/finance/webhook/asaas` chega como `/finance/webhook/asaas` (as URLs de webhook cadastradas nos provedores continuam as mesmas). Cabeçalhos de segurança continuam só no Next.
Aplicar sem derrubar o site:
```
sudo nginx -T > /tmp/nginx-atual.txt                       # guarde o real e compare com a referência
sudo cp infra/nginx-innovation.conf /etc/nginx/conf.d/innovation.conf   # troque SEU-DOMINIO; remova gzip/upstream duplicados
sudo nginx -t && sudo systemctl reload nginx                # reload, nunca restart
curl -sI https://SEU-DOMINIO/login | grep -ci '^strict-transport-security'    # 1
curl -s -o /dev/null -w '%{http_code}\n' https://SEU-DOMINIO/api/metrics       # 404
curl -s -o /dev/null -w '%{http_code}\n' https://SEU-DOMINIO/api/health        # 404
curl -s -o /dev/null -w '%{http_code}\n' https://SEU-DOMINIO/api/health/ready  # 200
for i in $(seq 1 30); do curl -s -o /dev/null -w '%{http_code} ' -X POST https://SEU-DOMINIO/api/auth/login -H 'content-type: application/json' -d '{}'; done; echo   # passa a 429
```
Status: `nginx -t` **NÃO VERIFICADO** (sem nginx nem daemon Docker na sessão de desenvolvimento); a cobertura é o teste de contrato `tests/contract/nginx-innovation.spec.ts`.

## Drift do schema (INF-12)
Produção aplica migrations por `apply-migrations.sh` (tabela `_manual_migrations`), não por `migrate deploy`. `scripts/deploy/check-schema-drift.sh` roda `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` (somente leitura) dentro do container da API e sai com 0 (sem drift), 1 (drift, mostra o SQL) ou 2 (não mediu). Ignora `_manual_migrations`. O `vps-update.sh` o chama ao final como **aviso não bloqueante**. A imagem não traz o CLI do Prisma (devDependency): o script usa `npx prisma@<versão do @prisma/client>` no container (precisa de saída para a internet). Rodar a primeira vez à mão: `bash scripts/deploy/check-schema-drift.sh; echo $?` e anexar o resultado. Pendente (decisão): baseline e migração para `migrate deploy` (junto de DEP-06) e renomear migrations com timestamp duplicado.

## CI: auditoria e actions (INF-11, DEP-05)
- Todas as actions externas estão fixadas por SHA de 40 caracteres com o comentário `# vX.Y.Z` (o Dependabot `github-actions` atualiza o SHA e o comentário). Cada job declara `permissions` mínimas.
- `ci.yml` tem `npm-audit` (`npm audit --omit=dev --audit-level=high`, `continue-on-error`, fora do `ci-ok`) e `dependency-review` (só PR). Quando o baseline de dependências ficar limpo (DEP-01..03), tire o `continue-on-error` e inclua os dois em `needs` do `ci-ok`.
- RISCO: `images.yml` publica builds de branches `claude/**` no mesmo namespace do GHCR de onde a produção puxa. Só publica `branch-<nome>` e o SHA do commit, nunca `latest`; o `vps-update.sh` só aceita SHA que pertence à `main`. Reforço manual recomendado: restringir a escrita no pacote GHCR ou usar outro repositório/namespace.
