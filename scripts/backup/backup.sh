#!/usr/bin/env bash
# Backup diário do Postgres: dump compactado + retenção local + cópia externa (rclone) opcional.
# Variáveis opcionais no .env:
#   BACKUP_DIR        (padrão: <projeto>/storage/backups)
#   BACKUP_KEEP_DAYS  (padrão: 14)
#   BACKUP_REMOTE     destino rclone, ex.: b2:meu-bucket/innovation  (vazio = só local, com aviso)
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
COMPOSE="docker compose -f docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-$PWD/storage/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/innovation_${STAMP}.sql.gz"
LOG="[backup $(date -Is)]"

mkdir -p "$BACKUP_DIR"
umask 077

echo "$LOG iniciando -> $FILE"
$COMPOSE exec -T db pg_dump -U "${POSTGRES_USER:-innovation}" -d "${POSTGRES_DB:-innovation_db}" --no-owner --clean --if-exists | gzip -9 > "$FILE.partial"

# Sanidade: arquivo não pode ser vazio nem truncado.
SIZE=$(stat -c %s "$FILE.partial")
[ "$SIZE" -gt 2048 ] || { echo "$LOG FALHA: dump suspeito ($SIZE bytes)"; rm -f "$FILE.partial"; exit 1; }
gzip -t "$FILE.partial" || { echo "$LOG FALHA: gzip corrompido"; rm -f "$FILE.partial"; exit 1; }
mv "$FILE.partial" "$FILE"
sha256sum "$FILE" > "$FILE.sha256"
echo "$LOG ok ($(du -h "$FILE" | cut -f1))"

# Uploads (currículos e anexos de suporte) também precisam de backup.
UPLOADS="$BACKUP_DIR/uploads_${STAMP}.tar.gz"
if $COMPOSE exec -T api sh -c 'test -d /data && tar -czf - -C /data .' > "$UPLOADS.partial" 2>/dev/null && [ -s "$UPLOADS.partial" ]; then
  mv "$UPLOADS.partial" "$UPLOADS"; echo "$LOG uploads ok ($(du -h "$UPLOADS" | cut -f1))"
else rm -f "$UPLOADS.partial"; fi

# Cópia externa
if [ -n "${BACKUP_REMOTE:-}" ]; then
  command -v rclone >/dev/null || { echo "$LOG FALHA: BACKUP_REMOTE definido, mas rclone não está instalado."; exit 1; }
  rclone copy "$FILE" "$BACKUP_REMOTE" && rclone copy "$FILE.sha256" "$BACKUP_REMOTE"
  [ -f "$UPLOADS" ] && rclone copy "$UPLOADS" "$BACKUP_REMOTE"
  echo "$LOG copiado para $BACKUP_REMOTE"
else
  echo "$LOG AVISO: BACKUP_REMOTE não configurado — backup apenas local (um disco perdido leva tudo)."
fi

# Retenção local
find "$BACKUP_DIR" -type f \( -name 'innovation_*.sql.gz*' -o -name 'uploads_*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
echo "$LOG retenção: ${KEEP_DAYS} dias. Arquivos atuais: $(find "$BACKUP_DIR" -name 'innovation_*.sql.gz' | wc -l)"
