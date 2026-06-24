#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/var/www/innovation.ia"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"
LOG_PREFIX="[clean-docker]"

cd "$APP_DIR"

echo "$LOG_PREFIX === ANTES ==="
docker system df
echo
echo "$LOG_PREFIX containers:"
$COMPOSE ps

echo "$LOG_PREFIX removendo imagens orfãs (dangling)..."
docker image prune -f

echo "$LOG_PREFIX removendo build cache nao utilizado..."
docker builder prune -f

echo "$LOG_PREFIX removendo containers parados..."
docker container prune -f

echo "$LOG_PREFIX === DEPOIS ==="
docker system df
echo
echo "$LOG_PREFIX containers:"
$COMPOSE ps

echo "$LOG_PREFIX conclusao: volumes e containers ativos preservados."