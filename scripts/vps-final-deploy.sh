#!/usr/bin/env bash
set -euo pipefail

cd /var/www/innovation.ia

echo "=== LIMPAR MIGRATION TRAVADA ==="
docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM _prisma_migrations WHERE migration_name = 'YYYYMMDDHHMMSS_add_management_and_aso' AND finished_at IS NULL;"

echo "=== APLICAR MIGRATIONS ==="
docker compose -f docker-compose.prod.yml --env-file .env exec -T api npm run prisma:deploy

echo "=== REINICIAR API ==="
docker compose -f docker-compose.prod.yml --env-file .env up -d api

echo "=== AGUARDAR 10s ==="
sleep 10

echo "=== VALIDAR ==="
curl -i https://vps8369.panel.icontainer.net/api/health
echo ""
echo "=== LOGIN ==="
curl -I https://vps8369.panel.icontainer.net/login