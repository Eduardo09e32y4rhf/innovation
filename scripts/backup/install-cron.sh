#!/usr/bin/env bash
# Agenda: backup diário às 03:15 e teste de restauração semanal (domingo 04:30). Idempotente.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
APP_DIR="$PWD"
LOG_DIR="$APP_DIR/storage/backups"
mkdir -p "$LOG_DIR"
chmod +x scripts/backup/*.sh

TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v 'innovation-backup' > "$TMP" || true
{
  echo "15 3 * * * cd $APP_DIR && bash scripts/backup/backup.sh >> $LOG_DIR/backup.log 2>&1 # innovation-backup"
  echo "30 4 * * 0 cd $APP_DIR && bash scripts/backup/restore-test.sh >> $LOG_DIR/restore-test.log 2>&1 # innovation-backup"
} >> "$TMP"
crontab "$TMP"; rm -f "$TMP"
echo "Cron instalado:"; crontab -l | grep innovation-backup
