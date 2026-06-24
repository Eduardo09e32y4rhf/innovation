#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/var/www/innovation.ia"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"

cd "$APP_DIR"

echo "[api-deploy] === START $(date) ==="

echo "[api-deploy] atualizando repositorio..."
git fetch origin
git reset --hard origin/main
git log --oneline -5

echo "[api-deploy] rebuildando e subindo API..."
$COMPOSE build api
$COMPOSE up -d api

echo "[api-deploy] aguardando API ficar pronta..."
for i in {1..30}; do
  if curl -fsS http://127.0.0.1:3333/health >/dev/null 2>&1; then
    echo "[api-deploy] API pronta."
    break
  fi
  echo "[api-deploy] aguardando... tentativa $i/30"
  sleep 5
done

echo "[api-deploy] aplicando migrations..."
$COMPOSE exec -T api npx prisma migrate deploy --schema prisma/schema.prisma || true

echo "[api-deploy] health externo:"
curl -i https://vps8369.panel.icontainer.net/api/health || true

echo "[api-deploy] === END $(date) ==="