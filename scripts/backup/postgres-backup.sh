#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/var/www/innovation.ia"
BACKUP_DIR="$APP_DIR/storage/backups"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"
LOG_PREFIX="[backup]"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="innovation_${TIMESTAMP}.sql"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "$LOG_PREFIX iniciando backup: $FILEPATH"

docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres pg_dump -U "${POSTGRES_USER:-innovation}" "${POSTGRES_DB:-innovation}" > "$FILEPATH"

echo "$LOG_PREFIX backup concluido: $FILEPATH ($(du -h "$FILEPATH" | cut -f1))"

# Manter ultimos 30 backups
cd "$BACKUP_DIR"
ls -1t *.sql 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "$LOG_PREFIX backups antigos removidos. Total: $(ls -1 *.sql 2>/dev/null | wc -l)"