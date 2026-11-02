# INF-09: compose e arquivos de infra legados

## Problema
`tests/contract/compose-ports.spec.ts` (bloco INF-09): 15 falhas antes (portas em 0.0.0.0 no docker-compose.yml raiz, test.yml e infra/*; watchtower/docker.sock/privileged; legado em infra/).

## Documentacao
n/a no catalogo.

## Correcao
- `git mv` para `docs/legado/infra/` (+ README de aviso): infra/docker-compose.yml, docker-compose.locaweb.yml, locaweb.env.example, Dockerfile.api, Dockerfile.web, nginx-web.conf, nginx-lb.conf, Caddyfile, render.yaml (roda db:seed), ecosystem.config.cjs.
- `docker-compose.yml` (raiz): marcado "SOMENTE DESENVOLVIMENTO", ClamAV `stable` (era latest), portas de clamav e web em 127.0.0.1. `docker-compose.test.yml`: portas 5436/6380 em 127.0.0.1.
- Mantidos em infra/: prometheus/alerts/alertmanager/loki/promtail, nginx-host-performance.conf, nginx-uptime.conf, keycloak, RUNBOOK, scripts. Prometheus apontando para servicos inexistentes: NAO tratado (fora do escopo; docker-compose.monitoring.yml so tem Uptime Kuma).
- Teste garante que scripts/deploy, scripts/backup, scripts/security e workflows so citam docker-compose.prod.yml.
- Docs atualizados: apps/api/README_API.md, docs/DEPLOY-VPS.md, nota em tests/security/seed-production-guard.spec.ts.

## Testes
compose-ports.spec.ts: 27 testes passam. `docker compose config --quiet` do compose raiz: ok.

## Conferir na VPS
`ss -ltn | grep -v 127.0.0.1` so deve mostrar 22/80/443. Decisao do usuario: apagar de vez docs/legado/infra.
