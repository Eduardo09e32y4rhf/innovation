# INF-08: ordem de subida (ClamAV, web)

## Problema
`tests/contract/compose-ports.spec.ts` (bloco INF-08): falhavam "clamav tem healthcheck" e "web espera a API saudavel".

## Documentacao
`clamdcheck.sh` na imagem oficial clamav/clamav: NAO VERIFICADO (sem acesso ao Docker Hub/docs; sem daemon para inspecionar a imagem). Usado conforme o catalogo. Conferir: `docker compose -f docker-compose.prod.yml exec clamav which clamdcheck.sh`.
`depends_on.condition`: NAO VERIFICADO online; `docker compose config` (CLI 29.9.1) aceitou e normalizou (`start_period: 3m0s`, `clamdcheck.sh`).

## Correcao
- clamav: `healthcheck: CMD clamdcheck.sh`, interval 30s, timeout 10s, retries 5, start_period 180s.
- web: `depends_on: api: condition: service_healthy`.
- Decisao: a API NAO espera o clamav saudavel. Se o scanner demorar, a API sobe e uploads falham fechado (503) ate o ClamAV ficar healthy (fail-closed preservado; um `service_healthy` bloquearia a API por minutos e o vps-update usa `--no-deps`).

## Testes
4 testes INF-08 passam; `docker compose config` valido com variaveis ficticias.

## Conferir na VPS
`docker compose -f docker-compose.prod.yml up -d` e `docker compose -f docker-compose.prod.yml ps` (clamav "starting" ate ~3 min, depois healthy; web so inicia com a API healthy).
