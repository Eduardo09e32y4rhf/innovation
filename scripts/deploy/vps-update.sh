#!/usr/bin/env bash
# Atualização segura da VPS: código → backup → migrations → build/subida → verificação de saúde (com rollback orientado).
# Uso: bash scripts/deploy/vps-update.sh [branch]   (padrão: main)
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
BRANCH="${1:-main}"
COMPOSE="docker compose -f docker-compose.prod.yml"
PREV="$(git rev-parse --short HEAD)"

echo "== 1/6 Código ($PREV → origin/$BRANCH)"
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"
NEW="$(git rev-parse --short HEAD)"

echo "== 2/6 Segredos (.env)"
[ -f .env ] || { echo "Falta .env. Rode: bash scripts/security/bootstrap-env.sh https://seu-dominio"; exit 1; }
bash scripts/security/bootstrap-env.sh >/dev/null   # só completa o que estiver faltando

echo "== 3/6 Backup antes de mexer no banco"
bash scripts/backup/backup.sh

echo "== 4/6 Migrations pendentes"
bash scripts/deploy/apply-migrations.sh

echo "== 5/6 Build e subida"
$COMPOSE up -d --build --remove-orphans

echo "== 6/6 Verificação de saúde"
for i in $(seq 1 30); do
  if $COMPOSE exec -T api wget -qO- http://127.0.0.1:3333/health >/dev/null 2>&1; then
    echo "API saudável. Deploy $PREV → $NEW concluído."
    $COMPOSE ps
    exit 0
  fi
  sleep 4
done

echo "FALHA: a API não ficou saudável em 2 minutos."
$COMPOSE logs --tail=60 api || true
echo
echo "Rollback do código:   git reset --hard $PREV && $COMPOSE up -d --build"
echo "Rollback do banco:    gunzip -c storage/backups/<ultimo>.sql.gz | $COMPOSE exec -T db psql -U \${POSTGRES_USER:-innovation} -d \${POSTGRES_DB:-innovation_db}"
exit 1
