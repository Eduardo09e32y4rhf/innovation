#!/usr/bin/env bash
# Rollback de producao para uma tag/SHA anterior.
# Uso: bash scripts/deploy/rollback.sh <tag|sha> [--restore-db]
# Migrations sao aditivas (nao ha "down"): o rollback do codigo normalmente basta. --restore-db so se dados foram corrompidos.
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
REF="${1:?informe a tag ou SHA (ex.: v1.4.2)}"
COMPOSE="docker compose -f docker-compose.prod.yml"
set -a; . ./.env; set +a

git fetch --tags origin
git checkout --detach "$REF"
$COMPOSE up -d --build --remove-orphans

if [ "${2:-}" = "--restore-db" ]; then
  LAST="$(ls -1t storage/backups/*.sql.gz | head -1)"
  echo "Restaurando $LAST (apaga alteracoes feitas depois do backup)"
  gunzip -c "$LAST" | $COMPOSE exec -T db psql -U "${POSTGRES_USER:-innovation}" -d "${POSTGRES_DB:-innovation_db}"
fi

for i in $(seq 1 30); do
  if $COMPOSE exec -T api wget -qO- http://127.0.0.1:3333/health >/dev/null 2>&1; then
    echo "Rollback para $REF concluido e saudavel."; exit 0
  fi
  sleep 4
done
echo "FALHA: API nao ficou saudavel apos rollback."; $COMPOSE logs --tail=60 api; exit 1
