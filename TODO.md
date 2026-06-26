# TODO — Stabilization & Real Deploy (no demo)

## Completed
- [x] Identified deploy fragility: migrations/seed em duplicidade (Dockerfile + scripts).
- [x] Baseline deployment strategy: migrations/seed moving to deploy script (approved A).

## Next steps
## Styling/UX (mobile)
- [ ] Ajustar layout que esteja bom no PC e também responsivo no celular (tamanho de fonte, espaçamento e tabelas/sections)

## Deploy (stability)
- [ ] Fix line endings CRLF/LF noise (opcional): manter scripts executáveis e diff limpo
- [ ] Atualizar `scripts/deploy/full-prod.sh` para usar o mesmo fluxo de migrations/seed de `api-prod.sh`

## Validações locais
- [ ] `npx prisma validate --schema apps/api/prisma/schema.prisma`
- [ ] Build API (ex.: `cd apps/api && npm run build:api`)
- [ ] Build Web (ex.: `cd apps/web && npm run build:web`)

## Smoke test na VPS (real)
- [ ] `curl -i https://vps8369.panel.icontainer.net/api/health`
- [ ] Login endpoint `/api/auth/login`


