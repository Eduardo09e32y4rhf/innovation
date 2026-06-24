#!/usr/bin/env bash
set -euo pipefail

cd /var/www/innovation.ia

echo "=== START $(date) ==="

git fetch origin
git reset --hard origin/main
git log --oneline -5

if [ -f .env ]; then
  grep -q '^REDIS_URL=' .env && sed -i 's|^REDIS_URL=.*|REDIS_URL=redis://redis:6379|' .env || echo 'REDIS_URL=redis://redis:6379' >> .env
else
  echo "REDIS_URL=redis://redis:6379" > .env
fi

docker compose -f docker-compose.prod.yml --env-file .env down --remove-orphans
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache api
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache web
docker compose -f docker-compose.prod.yml --env-file .env up -d redis postgres api web --force-recreate

sleep 30

docker compose -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.prod.yml --env-file .env exec api npm run prisma:deploy || true

echo "=== HEALTH ==="
curl -i https://vps8369.panel.icontainer.net/api/health || true
echo "=== LOGIN ==="
curl -I https://vps8369.panel.icontainer.net/login || true

echo "=== END $(date) ==="