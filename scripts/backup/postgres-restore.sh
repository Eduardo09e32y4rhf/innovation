#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/var/www/innovation.ia"
BACKUP_DIR="$APP_DIR/storage/backups"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"
LOG_PREFIX="[restore]"

if [ $# -lt 1 ]; then
  echo "Uso: $0 <arquivo_backup.sql>"
  echo "Backups disponiveis:"
  ls -1t "$BACKUP_DIR"/*.sql 2>/dev/null || echo "(nenhum)"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "$LOG_PREFIX arquivo nao encontrado: $BACKUP_FILE"
  exit 1
fi

echo "$LOG_PREFIX === INICIO DO RESTORE $(date) ==="
echo "$LOG_PREFIX arquivo: $BACKUP_FILE"
echo "$LOG_PREFIX tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"

if [ ! -f ".env" ]; then
  echo "$LOG_PREFIX .env nao encontrado. Abortando."
  exit 1
fi

echo "$LOG_PREFIX parando API..."
$COMPOSE stop api || true

echo "$LOG_PREFIX restaurando banco..."
docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U "${POSTGRES_USER:-innovation}" -d "${POSTGRES_DB:-innovation}" < "$BACKUP_FILE"

echo "$LOG_PREFIX subindo API..."
$COMPOSE up -d api

echo "$LOG_PREFIX aguardando API..."
for i in {1..30}; do
  if curl -fsS http://127.0.0.1:3333/health >/dev/null 2>&1; then
    echo "$LOG_PREFIX API pronta."
    break
  fi
  echo "$LOG_PREFIX aguardando... tentativa $i/30"
  sleep 5
done

echo "$LOG_PREFIX === FIM DO RESTORE $(date) ==="