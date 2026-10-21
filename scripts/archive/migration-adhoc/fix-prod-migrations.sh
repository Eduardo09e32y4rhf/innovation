#!/usr/bin/env bash
# Banco de producao que ja tem as tabelas antigas (criadas fora do "migrate deploy"):
# registra as migrations antigas como aplicadas e aplica SO as novas (candidatos e cargos).
# Antes de mexer em qualquer coisa, compara o banco com o schema e aborta se faltar algo alem do esperado.
# Uso (na VPS, na pasta do projeto): bash scripts/fix-prod-migrations.sh
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
FIRST_NEW="20261013120000_company_positions"
ALLOWED='CompanyPosition|CandidateAccount|CandidateLoginCode|CandidateSession|CandidateInvite|CandidateProfileView'
api=(docker compose -f "$COMPOSE_FILE" exec -T -w /app/apps/api api)

echo "== 1/4 Comparando o banco com o schema =="
"${api[@]}" sh -c 'npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script' > /tmp/migrate-diff.sql
cat /tmp/migrate-diff.sql

# Diferencas "cosmeticas" ja existentes no banco (default de id/updatedAt, indices antigos, tabela _manual_migrations) nao bloqueiam.
# Qualquer CREATE, ADD COLUMN ou DROP de coluna/tabela real fora das tabelas novas bloqueia.
BENIGN='DROP INDEX|DROP DEFAULT|SET DEFAULT|DROP TABLE "_manual_migrations"'
unexpected=$(grep -E '^(CREATE|ALTER|DROP)' /tmp/migrate-diff.sql | grep -Ev "\"($ALLOWED)\"|\"($ALLOWED)_" | grep -Ev "$BENIGN" || true)
if [[ -n "$unexpected" ]]; then
  echo
  echo "ABORTADO: o banco difere do schema em outros pontos alem das tabelas novas:" >&2
  echo "$unexpected" >&2
  echo "Nada foi alterado. Mande esta saida para analise." >&2
  exit 1
fi

echo "== 2/4 Registrando migrations antigas como aplicadas =="
for dir in $(ls apps/api/prisma/migrations | grep -E '^[0-9]{14}_' | sort); do
  [[ "$dir" < "$FIRST_NEW" ]] || continue
  "${api[@]}" npx prisma migrate resolve --applied "$dir" --schema prisma/schema.prisma >/dev/null 2>&1 && echo "  marcada: $dir" || echo "  (ja registrada) $dir"
done

echo "== 3/4 Aplicando as migrations novas =="
"${api[@]}" npx prisma migrate deploy --schema prisma/schema.prisma

echo "== 4/4 Situacao final =="
"${api[@]}" npx prisma migrate status --schema prisma/schema.prisma
docker compose -f "$COMPOSE_FILE" restart api
