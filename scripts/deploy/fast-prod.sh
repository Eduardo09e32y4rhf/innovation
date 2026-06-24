#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/var/www/innovation.ia"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"
LOCK_FILE="/tmp/innovation-fast-prod.lock"
LOG_PREFIX="[deploy-fast]"

cd "$APP_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$LOG_PREFIX já existe um deploy rodando. Abortando."
  exit 1
fi

echo "$LOG_PREFIX === START $(date) ==="

echo "$LOG_PREFIX limpando locks quebrados do git..."
rm -f .git/index.lock .git/refs/remotes/origin/main.lock .git/HEAD.lock || true

echo "$LOG_PREFIX removendo containers órfãos/inconsistentes..."
docker ps -a --filter "name=innovation-redis" -q | xargs -r docker rm -f || true
docker ps -a --filter "name=innovation-postgres" -q | xargs -r docker rm -f || true

echo "$LOG_PREFIX atualizando repositório..."
git fetch origin --prune
git reset --hard origin/main
git log --oneline -5

echo "$LOG_PREFIX garantindo REDIS_URL..."
grep -q '^REDIS_URL=' .env \
  && sed -i 's|^REDIS_URL=.*|REDIS_URL=redis://redis:6379|' .env \
  || echo 'REDIS_URL=redis://redis:6379' >> .env

echo "$LOG_PREFIX detectando mudanças..."
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD || echo "")

BUILD_API=false
BUILD_WEB=false

# API deve rebuildar quando mudar backend
if echo "$CHANGED_FILES" | grep -qE '^(apps/api/|prisma/|package.json|package-lock.json|apps/api/Dockerfile|docker-compose.prod.yml)'; then
  BUILD_API=true
fi

# WEB deve rebuildar quando mudar frontend
if echo "$CHANGED_FILES" | grep -qE '^(apps/web/|package.json|package-lock.json|apps/web/Dockerfile|docker-compose.prod.yml)'; then
  BUILD_WEB=true
fi

echo "$LOG_PREFIX arquivos alterados: $CHANGED_FILES"
echo "$LOG_PREFIX rebuild API: $BUILD_API | WEB: $BUILD_WEB"

echo "$LOG_PREFIX subindo base (redis/postgres)..."
$COMPOSE up -d redis postgres

if [ "$BUILD_API" = true ]; then
  echo "$LOG_PREFIX rebuildando API..."
  $COMPOSE build api
  echo "$LOG_PREFIX subindo API..."
  $COMPOSE up -d api

  echo "$LOG_PREFIX aguardando API ficar pronta..."
  for i in {1..30}; do
    if curl -fsS http://127.0.0.1:3333/health >/dev/null 2>&1; then
      echo "$LOG_PREFIX API pronta."
      break
    fi
    echo "$LOG_PREFIX aguardando API... tentativa $i/30"
    sleep 5
  done

  echo "$LOG_PREFIX aplicando migrations..."
  $COMPOSE exec -T api npm run prisma:deploy || true
else
  echo "$LOG_PREFIX API sem mudanças, pulando rebuild."
fi

if [ "$BUILD_WEB" = true ]; then
  echo "$LOG_PREFIX rebuildando WEB..."
  $COMPOSE build web
  echo "$LOG_PREFIX subindo WEB..."
  $COMPOSE up -d web
else
  echo "$LOG_PREFIX WEB sem mudanças, pulando rebuild."
fi

echo "$LOG_PREFIX validando nginx..."
nginx -t
systemctl reload nginx

echo "$LOG_PREFIX aguardando estabilização final..."
sleep 10

echo "$LOG_PREFIX containers:"
$COMPOSE ps

echo "$LOG_PREFIX health externo:"
curl -i https://vps8369.panel.icontainer.net/api/health || true

echo
echo "$LOG_PREFIX login externo:"
curl -I https://vps8369.panel.icontainer.net/login || true

echo "$LOG_PREFIX === END $(date) ==="