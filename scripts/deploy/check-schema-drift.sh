#!/usr/bin/env bash
# INF-12: mede se o banco REAL esta igual ao apps/api/prisma/schema.prisma (somente leitura).
# Roda `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script` dentro do container da API.
# Saida: 0 = sem drift | 1 = ha drift (o SQL que falta e mostrado) | 2 = nao foi possivel medir (API fora, sem rede para o npx, etc.).
# A tabela _manual_migrations (controle do apply-migrations.sh) nao esta no schema.prisma por desenho e e ignorada.
# A imagem da API nao traz o CLI do Prisma (devDependency): se faltar, usa `npx prisma@<mesma versao do @prisma/client>` (precisa de rede).
# Uso na VPS: bash scripts/deploy/check-schema-drift.sh   (vps-update.sh o chama ao final, como aviso nao bloqueante)
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
compose() { docker compose -f docker-compose.prod.yml "$@"; }

VER="$(compose exec -T api node -p "require('@prisma/client/package.json').version" 2>/dev/null | tr -d '\r\n' || true)"
if ! [[ "$VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Drift NAO medido: nao consegui ler a versao do @prisma/client no container da API." >&2
  exit 2
fi

if ! RAW="$(compose exec -T -e HOME=/tmp -e npm_config_cache=/tmp/.npm-drift api sh -c '
  cd /app/apps/api
  if [ -x ../../node_modules/.bin/prisma ]; then P=../../node_modules/.bin/prisma; else P="npx --yes prisma@'"$VER"'"; fi
  $P migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
')"; then
  echo "Drift NAO medido: o prisma migrate diff falhou (veja a mensagem acima)." >&2
  exit 2
fi

# Remove comentarios SQL, linhas vazias e a tabela de controle do apply-migrations.sh.
DIFF="$(printf '%s\n' "$RAW" | sed -E '/^[[:space:]]*--/d;/^[[:space:]]*$/d;/^DROP TABLE "_manual_migrations";$/d')"
if [ -z "$DIFF" ]; then
  echo "Schema sem drift: o banco bate com apps/api/prisma/schema.prisma."
  exit 0
fi
echo "DRIFT: o banco difere do schema.prisma. SQL que o prisma geraria (NAO aplique sem revisar):" >&2
printf '%s\n' "$DIFF"
exit 1
