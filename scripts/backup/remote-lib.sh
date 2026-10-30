#!/usr/bin/env bash
# Funções de backup remoto S3-compatível (Cloudflare R2 / Backblaze B2) via rclone EM CONTAINER.
# Nada é instalado no host. Só é usado quando BACKUP_REMOTE=s3. Configuração 100% por variáveis de ambiente:
#   BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY,
#   BACKUP_S3_PREFIX (padrão: innovation), BACKUP_REMOTE_RETENTION_DAYS (padrão: 30),
#   BACKUP_ENCRYPTION_PASSPHRASE (OBRIGATÓRIA: o repositório é público e os dados são pessoais/LGPD),
#   RCLONE_IMAGE (padrão: rclone/rclone:1.68.2).
# Este arquivo é "sourced" por backup.sh e restore-check.sh; não executa nada sozinho.

RCLONE_IMAGE="${RCLONE_IMAGE:-rclone/rclone:1.68.2}"

remote_s3_enabled() { [ "${BACKUP_REMOTE:-}" = "s3" ]; }

# Falha cedo (antes de gerar/enviar qualquer coisa) se a configuração estiver incompleta.
remote_s3_require_config() {
  local v missing=""
  for v in BACKUP_S3_ENDPOINT BACKUP_S3_BUCKET BACKUP_S3_ACCESS_KEY_ID BACKUP_S3_SECRET_ACCESS_KEY BACKUP_ENCRYPTION_PASSPHRASE; do
    [ -n "${!v:-}" ] || missing="$missing $v"
  done
  if [ -n "$missing" ]; then
    echo "FALHA: BACKUP_REMOTE=s3 exige:${missing}. BACKUP_ENCRYPTION_PASSPHRASE é obrigatória (nunca envie dump sem cifrar)." >&2
    return 1
  fi
  if [ "${#BACKUP_ENCRYPTION_PASSPHRASE}" -lt 16 ]; then
    echo "FALHA: BACKUP_ENCRYPTION_PASSPHRASE precisa ter 16+ caracteres." >&2
    return 1
  fi
  local d="${BACKUP_REMOTE_RETENTION_DAYS:-30}"
  case "$d" in ''|*[!0-9]*) echo "FALHA: BACKUP_REMOTE_RETENTION_DAYS deve ser inteiro (dias)." >&2; return 1;; esac
  [ "$d" -ge 1 ] || { echo "FALHA: BACKUP_REMOTE_RETENTION_DAYS deve ser >= 1." >&2; return 1; }
  command -v docker >/dev/null || { echo "FALHA: docker não encontrado (rclone roda em container)." >&2; return 1; }
  command -v openssl >/dev/null || { echo "FALHA: openssl não encontrado." >&2; return 1; }
}

remote_s3_path() { echo "bkp:${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX:-innovation}"; }

# rclone em container. Segredos vão por variável de ambiente (-e NOME, sem valor na linha de comando).
# Uso: remote_s3_rclone [--mount DIR] <args do rclone...>
remote_s3_rclone() {
  local mount=""
  if [ "${1:-}" = "--mount" ]; then mount="$2"; shift 2; fi
  export RCLONE_CONFIG_BKP_TYPE=s3 RCLONE_CONFIG_BKP_PROVIDER=Other \
         RCLONE_CONFIG_BKP_ENDPOINT="$BACKUP_S3_ENDPOINT" \
         RCLONE_CONFIG_BKP_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
         RCLONE_CONFIG_BKP_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
         RCLONE_CONFIG_BKP_NO_CHECK_BUCKET=true
  local args=(run --rm -e RCLONE_CONFIG_BKP_TYPE -e RCLONE_CONFIG_BKP_PROVIDER -e RCLONE_CONFIG_BKP_ENDPOINT \
              -e RCLONE_CONFIG_BKP_ACCESS_KEY_ID -e RCLONE_CONFIG_BKP_SECRET_ACCESS_KEY -e RCLONE_CONFIG_BKP_NO_CHECK_BUCKET)
  [ -n "$mount" ] && args+=(-v "$mount:/data")
  docker "${args[@]}" "$RCLONE_IMAGE" "$@"
}

# Cifra FILE -> FILE.enc (AES-256-CBC + PBKDF2). A senha vai por env, nunca por argumento.
remote_s3_encrypt() {
  local in="$1" out="$1.enc"
  openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -in "$in" -out "$out.partial" -pass env:BACKUP_ENCRYPTION_PASSPHRASE
  mv "$out.partial" "$out"
  ( cd "$(dirname "$out")" && sha256sum "$(basename "$out")" > "$(basename "$out").sha256" )
  echo "$out"
}

# Decifra FILE.enc -> stdout.
remote_s3_decrypt() {
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in "$1" -pass env:BACKUP_ENCRYPTION_PASSPHRASE
}

# Envia arquivos (já cifrados) e aplica a retenção remota.
remote_s3_upload() {
  local f dir
  for f in "$@"; do
    dir="$(dirname "$f")"
    remote_s3_rclone --mount "$dir" copyto "/data/$(basename "$f")" "$(remote_s3_path)/$(basename "$f")"
  done
}

remote_s3_prune() {
  remote_s3_rclone delete --min-age "${BACKUP_REMOTE_RETENTION_DAYS:-30}d" "$(remote_s3_path)"
}
