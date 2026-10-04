#!/usr/bin/env bash
# Prova que o backup mais recente RESTAURA: carrega num banco temporário, confere tabelas/linhas e apaga o temporário.
# Não toca no banco de produção. Saída 0 = backup restaurável.
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
COMPOSE="docker compose -f docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-$PWD/storage/backups}"
DB_USER="${POSTGRES_USER:-innovation}"
FILE="${1:-$(ls -1t "$BACKUP_DIR"/innovation_*.sql.gz 2>/dev/null | head -n1)}"
TMP_DB="restore_test_$(date +%s)"

[ -n "$FILE" ] && [ -f "$FILE" ] || { echo "Nenhum backup encontrado em $BACKUP_DIR"; exit 1; }
[ -f "$FILE.sha256" ] && (cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$FILE").sha256" >/dev/null) && echo "checksum ok"
echo "Restaurando $(basename "$FILE") em $TMP_DB ..."

cleanup() { $COMPOSE exec -T db psql -U "$DB_USER" -d postgres -qc "DROP DATABASE IF EXISTS \"$TMP_DB\";" >/dev/null 2>&1 || true; }
trap cleanup EXIT

$COMPOSE exec -T db psql -U "$DB_USER" -d postgres -qc "CREATE DATABASE \"$TMP_DB\";"
gunzip -c "$FILE" | $COMPOSE exec -T db psql -U "$DB_USER" -d "$TMP_DB" -v ON_ERROR_STOP=0 -q >/dev/null 2>"$BACKUP_DIR/.restore-test.err" || true

TABLES=$($COMPOSE exec -T db psql -U "$DB_USER" -d "$TMP_DB" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
COMPANIES=$($COMPOSE exec -T db psql -U "$DB_USER" -d "$TMP_DB" -Atc 'SELECT count(*) FROM "Company";' 2>/dev/null || echo "erro")
USERS=$($COMPOSE exec -T db psql -U "$DB_USER" -d "$TMP_DB" -Atc 'SELECT count(*) FROM "User";' 2>/dev/null || echo "erro")
echo "tabelas=$TABLES empresas=$COMPANIES usuarios=$USERS"

if [ "${TABLES:-0}" -ge 20 ] && [ "$COMPANIES" != "erro" ] && [ "$USERS" != "erro" ]; then
  echo "RESTAURAÇÃO OK — o backup é utilizável."
else
  echo "RESTAURAÇÃO FALHOU — veja $BACKUP_DIR/.restore-test.err"; exit 1
fi
