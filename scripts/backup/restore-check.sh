#!/usr/bin/env bash
# Verifica o ÚLTIMO backup remoto (BACKUP_REMOTE=s3): baixa, confere sha256, decifra e valida
# (gunzip -t + listagem do conteúdo do dump). NÃO toca no banco real nem no volume de produção.
# Uso: bash scripts/backup/restore-check.sh
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
. "$PWD/scripts/backup/remote-lib.sh"
LOG="[restore-check $(date -Is)]"

remote_s3_enabled || { echo "$LOG BACKUP_REMOTE não é 's3'; nada a verificar."; exit 2; }
remote_s3_require_config || exit 1

WORK="$(mktemp -d)"; chmod 700 "$WORK"
trap 'rm -rf "$WORK"' EXIT

LATEST="$(remote_s3_rclone lsf "$(remote_s3_path)" --files-only | grep -E '^innovation_.*\.sql\.gz\.enc$' | sort | tail -1 || true)"
[ -n "$LATEST" ] || { echo "$LOG FALHA: nenhum backup innovation_*.sql.gz.enc no remoto."; exit 1; }
echo "$LOG mais recente: $LATEST"

remote_s3_rclone --mount "$WORK" copyto "$(remote_s3_path)/$LATEST" "/data/$LATEST"
remote_s3_rclone --mount "$WORK" copyto "$(remote_s3_path)/$LATEST.sha256" "/data/$LATEST.sha256"
( cd "$WORK" && sha256sum -c "$LATEST.sha256" ) || { echo "$LOG FALHA: sha256 do arquivo cifrado não confere."; exit 1; }

PLAIN="$WORK/${LATEST%.enc}"
remote_s3_decrypt "$WORK/$LATEST" > "$PLAIN" || { echo "$LOG FALHA: não decifrou (passphrase errada?)."; exit 1; }
gunzip -t "$PLAIN" || { echo "$LOG FALHA: gzip inválido após decifrar."; exit 1; }

# O dump é SQL puro (pg_dump padrão): valida estrutura sem restaurar. Se for formato custom, usa pg_restore --list.
HEAD="$(gunzip -c "$PLAIN" | head -c 5)"
if [ "$HEAD" = "PGDMP" ]; then
  gunzip -c "$PLAIN" | docker run --rm -i postgres:16-alpine pg_restore --list >/dev/null || { echo "$LOG FALHA: pg_restore --list"; exit 1; }
else
  TABLES="$(gunzip -c "$PLAIN" | grep -c '^CREATE TABLE' || true)"
  COPIES="$(gunzip -c "$PLAIN" | grep -c '^COPY ' || true)"
  [ "$TABLES" -gt 0 ] || { echo "$LOG FALHA: dump sem CREATE TABLE."; exit 1; }
  gunzip -c "$PLAIN" | tail -c 400 | grep -q 'PostgreSQL database dump complete' || { echo "$LOG FALHA: dump truncado (sem rodapé)."; exit 1; }
  echo "$LOG tabelas: $TABLES, blocos COPY: $COPIES"
fi
echo "$LOG OK: $LATEST íntegro e decifrável (banco real não foi tocado)."
