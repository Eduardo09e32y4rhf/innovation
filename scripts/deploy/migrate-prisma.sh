#!/usr/bin/env bash
# Aplica as migrations do Prisma no banco com `prisma migrate deploy` (unico mecanismo aceito para producao).
# ATENCAO: o vps-update.sh ainda usa apply-migrations.sh (aplicador manual com _manual_migrations). Para trocar,
# o banco de producao precisa antes ser baselined no Prisma (`prisma migrate resolve --applied <migration>` para o historico
# ja aplicado). Ensaiar numa copia do banco de producao. Ver scripts/README_SCRIPTS.md.
# Uso (na VPS, na pasta do projeto): bash scripts/deploy/migrate-prisma.sh
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

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
