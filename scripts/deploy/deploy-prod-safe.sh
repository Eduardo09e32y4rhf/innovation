#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/var/www/innovation.ia"
BRANCH="${1:-release/prod-segura}"
DOMAIN="https://vps8369.panel.icontainer.net"
TS="$(date +%Y%m%d-%H%M%S)"
DEPLOY_STARTED=0

cd "$APP_DIR"

rollback() {
  echo "===== ERRO DETECTADO: INICIANDO ROLLBACK ====="

  if [ "$DEPLOY_STARTED" = "1" ]; then
    docker tag innovationia-api:rollback-"$TS" innovationia-api:latest 2>/dev/null || true
    docker tag innovationia-web:rollback-"$TS" innovationia-web:latest 2>/dev/null || true

    docker rm -f innovation-api innovation-web 2>/dev/null || true

    docker compose -f docker-compose.prod.yml --env-file .env up -d --no-deps --force-recreate api || true

    docker run -d \
      --name innovation-web \
      --restart unless-stopped \
      --network innovationia_default \
      -p 127.0.0.1:3000:3000 \
      -e NODE_ENV=production \
      -e PORT=3000 \
      -e NEXT_TELEMETRY_DISABLED=1 \
      innovationia-web:latest || true

    sleep 15
    curl -I "$DOMAIN" || true
    curl -i "$DOMAIN/api/health" || true
  fi

  echo "===== ROLLBACK FINALIZADO. VERIFICAR LOGS ====="
}
trap rollback ERR

echo "===== 1 VERIFICANDO SE VPS ESTA LIMPA ====="
if [ -n "$(git status --porcelain)" ]; then
  echo "ERRO: existem alterações locais na VPS."
  echo "Antes do deploy, salvar/commitar/stash os arquivos abaixo:"
  git status --short
  exit 1
fi

echo "===== 2 BACKUP DO BANCO ====="
mkdir -p backups
docker exec innovation-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' > "backups/pre-deploy-$TS.sql"

echo "===== 3 BACKUP DAS IMAGENS ATUAIS ====="
docker image inspect innovationia-api:latest >/dev/null 2>&1 && docker tag innovationia-api:latest innovationia-api:rollback-"$TS" || true
docker image inspect innovationia-web:latest >/dev/null 2>&1 && docker tag innovationia-web:latest innovationia-web:rollback-"$TS" || true

echo "===== 4 BAIXANDO BRANCH DE RELEASE ====="
git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"

echo "===== 5 BUILD API E WEB SEM PARAR PRODUCAO ====="
docker compose -f docker-compose.prod.yml --env-file .env build api web

echo "===== 6 MIGRATIONS SEGURAS ====="
docker compose -f docker-compose.prod.yml --env-file .env run --rm --no-deps api \
  sh -lc 'cd /usr/src/app/apps/api && npx prisma migrate deploy --schema prisma/schema.prisma'

echo "===== 7 SUBINDO API NOVA ====="
DEPLOY_STARTED=1
docker rm -f innovation-api 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env up -d --no-deps --force-recreate api

sleep 25

echo "===== 8 TESTANDO API ====="
curl -fsS "$DOMAIN/api/health" >/tmp/innovation-api-health.json
cat /tmp/innovation-api-health.json

echo "===== 9 SUBINDO WEB NOVO NA PORTA CORRETA ====="
docker rm -f innovation-web 2>/dev/null || true
docker run -d \
  --name innovation-web \
  --restart unless-stopped \
  --network innovationia_default \
  -p 127.0.0.1:3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e NEXT_TELEMETRY_DISABLED=1 \
  innovationia-web:latest

sleep 20

echo "===== 10 TESTANDO WEB ====="
WEB_CODE="$(curl -k -s -o /dev/null -w "%{http_code}" "$DOMAIN")"
echo "WEB_CODE=$WEB_CODE"

if [ "$WEB_CODE" != "200" ] && [ "$WEB_CODE" != "307" ] && [ "$WEB_CODE" != "308" ]; then
  echo "ERRO: Web respondeu status inesperado: $WEB_CODE"
  exit 1
fi

echo "===== 11 TESTANDO ROTAS CRITICAS SEM TOKEN ====="
for rota in notifications notifications/unread-count notifications/dashboard-widget management/aso time-rules time-closing; do
  CODE="$(curl -k -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/$rota")"
  echo "/api/$rota => $CODE"
  if [ "$CODE" = "500" ] || [ "$CODE" = "502" ]; then
    echo "ERRO: rota critica voltou com $CODE"
    exit 1
  fi
done

echo "===== 12 STATUS FINAL ====="
docker ps --filter "name=innovation"
echo ""
echo "Deploy concluido com sucesso na branch: $BRANCH"
echo "Backup banco: backups/pre-deploy-$TS.sql"
echo "Rollback images: innovationia-api:rollback-$TS e innovationia-web:rollback-$TS"