# UNIFICA-infra: deploy, CI e configuracao

## Decisao central
Um unico deploy: `deploy.yml` (theirs: so apos CI, imagens construidas no GitHub, staging -> producao) chama `vps-update.sh <sha> --prebuilt`; o script mantem validacao previa, backup, migrations, troca so de API/web e rollback das imagens anteriores. O modo sem `--prebuilt` (ours) baixa do GHCR (`images.yml`, mantido) com espera, fallback para a imagem da main e, so como ultimo recurso, build local com swap.

## Arquivo a arquivo
- `docker-compose.prod.yml`: `image: ${API_IMAGE:-ghcr.io/...:${IMAGE_TAG:-latest}}` (+ `build:` como reserva), `logging` do theirs, 31 variaveis e build args do ours. Removida a chave duplicada `ASAAS_WEBHOOK_SECRET` (o theirs a repetiu). Healthcheck da API em `/health/live` (theirs). `docker compose config -q` OK.
- `scripts/deploy/vps-update.sh`: base do theirs (flock em `.deploy`, SHA da main, bootstrap, preflight, backup, migrations, rollback, `health/ready`) + do ours (pull GHCR com espera, fallback main, build local com swap/nice, stash de alteracoes locais). Perde: deploy de branch arbitraria (theirs exige main/SHA da main, por seguranca).
- `scripts/deploy/vps-update-bg.sh`: so texto de uso/mensagem final ajustados.
- `scripts/security/bootstrap-env.sh`: versao do theirs (so `METRICS_TOKEN`). **Desvio do pedido**: `tests/contract/production-bootstrap.spec.ts` (theirs) proibe gerar `ASAAS_WEBHOOK_TOKEN`/`MERCADOPAGO_WEBHOOK_SECRET` (segredo aleatorio nao bate com o cadastrado no provedor).
- `apps/api/src/config/env.validation.ts`: exports de repasse/build args do ours + regra do theirs (METRICS_TOKEN sempre; webhook so se ASAAS_API_KEY / MERCADOPAGO_ACCESS_TOKEN). Seguro porque os controllers de webhook ja rejeitam sem segredo (fail-closed). Spec: versao do theirs.
- `.env.example`: bloco de variaveis repassadas do ours mantido. `ci.yml`/`e2e.yml`: `ref` do theirs (workflow_call). `infra/Dockerfile.api`: healthcheck `/health/live` na porta 3333 (o theirs dizia 3001, a API usa 3333). `README_SCRIPTS.md`: ambos os scripts documentados.

## Testes
`npx vitest run tests/contract apps/api/src/config`: 14 arquivos, 107 testes passando. `bash -n` em scripts/deploy/*.sh e bootstrap-env.sh OK.

## Pendencias / decisao do usuario
- Se quiser exigir webhook sempre (ours), e preciso alterar o teste do theirs e gerar os segredos; deixei o comportamento do theirs.
- `images.yml` e `deploy.yml` constroem a imagem separadamente em push na main (custo duplicado); considerar limitar `images.yml` a `claude/**`/dispatch.
- `--no-deps` no deploy assume stack ja instalada (primeira instalacao: `docker compose up -d` manual).
