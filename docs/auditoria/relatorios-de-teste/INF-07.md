# INF-07: imagens da API e do web sem root, com HEALTHCHECK

## Problema (teste que falhava)
`tests/contract/dockerfiles.spec.ts`: 6 de 16 falhavam antes (sem USER node na API, sem HEALTHCHECK em nenhuma, /data e /app/storage sem dono node, .next/cache do web sem dono, vps-update sem chown do volume).
Achado confirmado: `apps/api/Dockerfile` ja era multi-stage com `npm prune --omit=dev`, mas rodava como root e sem HEALTHCHECK; o web ja tinha `USER node`, sem HEALTHCHECK.

## Documentacao
- https://docs.docker.com/build/building/best-practices/ e https://docs.docker.com/reference/dockerfile/: docs.docker.com bloqueado na rede da sessao (ENOTFOUND): NAO VERIFICADO online. Regras aplicadas por conhecimento previo (usuario nao-root, multi-stage, HEALTHCHECK com --start-period). Marcador: NAO VERIFICADO.

## Correcao
- API: `mkdir -p /data/recruitment /data/support /app/storage && chown -R node:node`, `USER node`, `HEALTHCHECK` (wget /health/live :3333). Codigo continua de root em /app (somente leitura para node). Porta 3333 e `CMD node apps/api/dist/main.js` mantidos (a imagem nao usa `npm run start:api`; o CMD ja era node direto).
- Web: `.next/cache` do usuario node, `HEALTHCHECK` (wget :3000).
- `scripts/deploy/vps-update.sh`: antes de subir a API, `chown -R node:node /data` idempotente com `--user root` (o volume api_data antigo e de root; sem isso a API nao grava curriculos/anexos).
- Mantido o `npm prune --omit=dev` no stage de build (apos `prisma generate` e build) em vez de um segundo `npm ci --omit=dev`: o CLI do prisma e devDependency, e refazer a instalacao nao pode ser validado sem build real.

## Arquivos
apps/api/Dockerfile, apps/web/Dockerfile, scripts/deploy/vps-update.sh, tests/contract/dockerfiles.spec.ts.

## Testes
`npx vitest run tests/contract/dockerfiles.spec.ts tests/contract/vps-deploy.spec.ts`: 2 arquivos, 21 testes passaram (antes: 6 falhas). Suite tests/contract + tests/security + backup: 270 passaram, 1 falha de OUTRO grupo (API-01 http-status-contract), 3 expected fail preexistentes.
hadolint nao instalado; `docker build` impossivel (CLI sem daemon). **NAO VERIFICADO em build real.**

## Riscos que sobram / conferir na VPS
1. Depois do deploy: `docker compose -f docker-compose.prod.yml exec api sh -c 'id -u; ls -ld /data /data/* /app/storage'` (uid != 0).
2. `docker compose -f docker-compose.prod.yml ps` (api e web healthy); enviar um curriculo de teste (grava em /data/recruitment).
3. `WHATSAPP_SESSION_PATH` vazio grava em /app/storage/whatsapp (efemero, nao e volume; ja era assim).
4. CI ja faz docker build + run da imagem (job build); a primeira execucao no GitHub e a prova real.
5. Adiado: `IMAGE_TAG` obrigatorio no compose (`${IMAGE_TAG:?}`): scripts de backup/migracao rodam `docker compose` sem API_IMAGE e passariam a falhar; o deploy ja usa SHA via API_IMAGE. Decisao do usuario.
