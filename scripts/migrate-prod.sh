#!/usr/bin/env bash
# Aplica as migrations do Prisma no banco de PRODUCAO (rode na VPS, na pasta do projeto, depois do git pull).
# Uso: bash scripts/migrate-prod.sh
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
compose=(docker compose -f "$COMPOSE_FILE")
# O prisma fica em apps/api/node_modules: rodar da raiz dá "sh: prisma: not found".
run=("${compose[@]}" exec -T -w /app/apps/api api npx prisma)

echo "== Situação atual das migrations =="
"${run[@]}" migrate status --schema prisma/schema.prisma || true

echo "== Aplicando migrations pendentes =="
"${run[@]}" migrate deploy --schema prisma/schema.prisma

echo "== Situação final =="
"${run[@]}" migrate status --schema prisma/schema.prisma
