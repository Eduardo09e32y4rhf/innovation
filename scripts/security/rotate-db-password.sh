#!/usr/bin/env bash
# Troca a senha do usuário do Postgres para o valor de POSTGRES_PASSWORD do .env.
# Necessário porque o Postgres só lê POSTGRES_PASSWORD na criação do volume: a senha antiga continua valendo até ser alterada.
# Rode ANTES de subir a stack com o compose novo (o container "db" atual precisa estar no ar).
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
COMPOSE="docker compose -f docker-compose.prod.yml"
USER_NAME="${POSTGRES_USER:-innovation}"

[ -n "${POSTGRES_PASSWORD:-}" ] || { echo "POSTGRES_PASSWORD vazio no .env. Rode bootstrap-env.sh antes."; exit 1; }
case "$POSTGRES_PASSWORD" in *\'*) echo "A senha não pode conter aspas simples."; exit 1;; esac

echo "Alterando a senha do usuário '$USER_NAME' no Postgres em execução..."
$COMPOSE exec -T db psql -U "$USER_NAME" -d postgres -v ON_ERROR_STOP=1 \
  -c "ALTER USER \"$USER_NAME\" WITH PASSWORD '$POSTGRES_PASSWORD';"
echo "Concluído. Agora: docker compose -f docker-compose.prod.yml up -d --build --force-recreate"
