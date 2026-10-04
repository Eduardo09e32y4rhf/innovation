#!/usr/bin/env bash
# Aplica migrations SQL pendentes e registra cada uma (tabela _manual_migrations). Para na primeira falha, dentro de transaÃ§Ã£o.
# As migrations antigas jÃ¡ foram aplicadas Ã  mÃ£o no passado: por padrÃ£o sÃ³ entram as de nome >= MIGRATIONS_FROM.
# Uso: bash scripts/deploy/apply-migrations.sh [--dry-run]
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
COMPOSE="docker compose -f docker-compose.prod.yml"
DB_USER="${POSTGRES_USER:-innovation}"; DB_NAME="${POSTGRES_DB:-innovation_db}"
FROM="${MIGRATIONS_FROM:-20261006100001}"
DRY="${1:-}"
psql_() { $COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"; }

psql_ -qc 'CREATE TABLE IF NOT EXISTS "_manual_migrations" (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());'

# Banco vazio (ex.: staging novo): nasce do baseline, que ja contem todo o historico anterior.
TABLES=$(psql_ -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name <> '_manual_migrations';")
if [ "$TABLES" = "0" ] && [ "$DRY" != "--dry-run" ]; then
  BASE=$(ls -1 apps/api/prisma/migrations | grep _baseline$ | tail -1)
  echo "Banco vazio: aplicando $BASE"
  { echo "BEGIN;"; cat "apps/api/prisma/migrations/$BASE/migration.sql"; echo; echo "INSERT INTO \"_manual_migrations\"(name) VALUES ('$BASE');"; echo "COMMIT;"; } | psql_ -q
fi

APPLIED=$(psql_ -Atc 'SELECT name FROM "_manual_migrations";')
PENDING=0
for dir in $(ls -1 apps/api/prisma/migrations | sort); do
  [ -f "apps/api/prisma/migrations/$dir/migration.sql" ] || continue
  [[ "$dir" =~ ^[0-9]{14}_ ]] || continue
  [[ "$dir" == *_baseline ]] && continue
  [[ "${dir:0:14}" < "$FROM" ]] && continue
  echo "$APPLIED" | grep -qx "$dir" && continue
  PENDING=$((PENDING+1))
  echo "â†’ $dir"
  [ "$DRY" = "--dry-run" ] && continue
  { echo "BEGIN;"; cat "apps/api/prisma/migrations/$dir/migration.sql"; echo; echo "INSERT INTO \"_manual_migrations\"(name) VALUES ('$dir');"; echo "COMMIT;"; } | psql_ -q
  echo "  aplicada."
done
echo "Pendentes: $PENDING $( [ "$DRY" = "--dry-run" ] && echo '(simulaÃ§Ã£o)')"
