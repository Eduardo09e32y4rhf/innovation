#!/usr/bin/env bash
# Gera o .env de produção com segredos fortes. NUNCA sobrescreve valores que já existem.
# Uso:  bash scripts/security/bootstrap-env.sh [https://seu-dominio.com.br]
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
ENV_FILE=".env"
DOMAIN="${1:-}"

command -v openssl >/dev/null || { echo "openssl não encontrado."; exit 1; }
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

has() { grep -qE "^$1=.+" "$ENV_FILE"; }
put() { # chave valor
  if has "$1"; then echo "  mantido  $1"; else
    sed -i "/^$1=/d" "$ENV_FILE"; printf '%s=%s\n' "$1" "$2" >> "$ENV_FILE"; echo "  gerado   $1"; fi
}

echo "Preparando $ENV_FILE (valores existentes são preservados):"
put POSTGRES_USER innovation
put POSTGRES_DB innovation_db
put POSTGRES_PASSWORD "$(openssl rand -hex 24)"
put REDIS_PASSWORD "$(openssl rand -hex 24)"
put JWT_SECRET "$(openssl rand -hex 32)"
put KMS_MASTER_KEY "$(openssl rand -hex 32)"
put TRIAL_DOCUMENT_HASH_SECRET "$(openssl rand -hex 32)"

if [ -n "$DOMAIN" ]; then
  put ALLOWED_ORIGINS "$DOMAIN"
  put APP_URL "$DOMAIN"
fi
if ! has ALLOWED_ORIGINS; then
  echo
  echo "ATENÇÃO: defina ALLOWED_ORIGINS e APP_URL (ex.: https://innovationia.com.br) rodando:"
  echo "  bash scripts/security/bootstrap-env.sh https://innovationia.com.br"
fi

echo
echo "Pronto. Faça backup deste arquivo em local seguro (gerenciador de senhas): sem ele não há como recuperar os segredos."
echo "Próximo passo: bash scripts/security/rotate-db-password.sh"
