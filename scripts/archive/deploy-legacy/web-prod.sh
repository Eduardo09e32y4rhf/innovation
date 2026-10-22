#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/var/www/innovation.ia"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"

cd "$APP_DIR"

echo "[web-deploy] === START $(date) ==="

echo "[web-deploy] atualizando repositorio..."
git fetch origin
git reset --hard origin/main
git log --oneline -5

echo "[web-deploy] rebuildando e subindo WEB..."
$COMPOSE build web
$COMPOSE up -d web

echo "[web-deploy] validando nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "[web-deploy] aguardando estabilizacao..."
sleep 10

echo "[web-deploy] login externo:"
curl -I https://vps8369.panel.icontainer.net/login || true

echo "[web-deploy] === END $(date) ==="