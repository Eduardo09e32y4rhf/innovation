# INF-12: drift do schema em producao

## Problema
`tests/contract/schema-drift.spec.ts` falhava (script inexistente). Achado confirmado: producao usa apply-migrations.sh/_manual_migrations; nada media drift. Medicao real no banco da VPS: **NAO FEITA** (sem acesso).

## Documentacao
`prisma migrate diff --help` do Prisma 6.19.3 local: VERIFICADO (--from-url, --to-schema-datamodel, --script, --exit-code; somente leitura). Pagina de baselining: NAO consultada.

## Correcao
`scripts/deploy/check-schema-drift.sh`: roda o diff no container da API; filtra comentarios e `DROP TABLE "_manual_migrations"`; saidas 0/1/2. A imagem nao tem o CLI do Prisma (devDependency): usa `npx prisma@<versao do @prisma/client>` (precisa de rede). `vps-update.sh` o chama no fim como aviso nao bloqueante. Docs em DEPLOY-VPS.md.

## Testes
schema-drift.spec.ts (docker simulado por stub): 6 passam; vps-deploy.spec.ts 6 passam (novo caso: drift nao derruba nem reverte o deploy).

## Conferir na VPS
`bash scripts/deploy/check-schema-drift.sh; echo $?`. Nao feito: baseline/migrate deploy, timestamps duplicados, mover schema.diff.sql/schema.old.prisma/migrations_legacy (pertencem a outro grupo/decisao).
