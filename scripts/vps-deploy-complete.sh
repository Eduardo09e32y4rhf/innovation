#!/usr/bin/env bash
set -euo pipefail

echo "=== DEPLOY COMPLETO - VPS ==="
echo ""

echo "=== ATUALIZAR CÓDIGO ==="
cd /var/www/innovation.ia

if [ ! -f .env ]; then
  echo "Erro: .env nao encontrado em /var/www/innovation.ia"
  exit 1
fi
set -a
. ./.env
set +a

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
  echo "Erro: POSTGRES_USER/POSTGRES_DB nao carregados do .env"
  exit 1
fi

git fetch https://github.com/Eduardo09e32y4rhf/innovation.git main
git reset --hard FETCH_HEAD

echo ""
echo "=== SUBIR BASE ==="
docker compose -f docker-compose.prod.yml --env-file .env up -d postgres redis

echo ""
echo "=== AGUARDAR BASE ==="
sleep 8

echo ""
echo "=== LIMPAR MIGRATION TRAVADA ==="
PG_USER=$POSTGRES_USER
PG_DB=$POSTGRES_DB

echo "Usuário DB: $PG_USER"
echo "Banco: $PG_DB"

docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -c "DELETE FROM _prisma_migrations WHERE migration_name LIKE '%add_management_and_aso%' AND finished_at IS NULL;"

echo ""
echo "=== BUILD API E WEB ==="
docker compose -f docker-compose.prod.yml --env-file .env build api web

echo ""
echo "=== SUBIR CONTAINERS ==="
docker compose -f docker-compose.prod.yml --env-file .env up -d api web

echo ""
echo "=== AGUARDAR 15 SEGUNDOS ==="
sleep 15

echo ""
echo "=== APLICAR MIGRATIONS ==="
docker compose -f docker-compose.prod.yml --env-file .env exec -T api npm run db:deploy

echo ""
echo "=== REINICIAR API ==="
docker compose -f docker-compose.prod.yml --env-file .env restart api

echo ""
echo "=== AGUARDAR 10 SEGUNDOS ==="
sleep 10

echo ""
echo "=== VALIDAR ==="
echo "Health API:"
curl -i https://vps8369.panel.icontainer.net/api/health 2>/dev/null | head -5 || echo "Falha no health check"

echo ""
echo "Login WEB:"
curl -I https://vps8369.panel.icontainer.net/login 2>/dev/null | head -3 || echo "Falha no login"

echo ""
echo "=== LOGS API (últimas 30 linhas) ==="
docker logs innovation-api --tail 30 2>/dev/null || echo "Sem logs"

echo ""
echo "=== STATUS CONTAINERS ==="
docker compose -f docker-compose.prod.yml --env-file .env ps

echo ""
echo "=== DEPLOY FINALIZADO ==="