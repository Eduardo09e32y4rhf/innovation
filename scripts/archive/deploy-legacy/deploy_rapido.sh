#!/bin/bash
# ─── Script de Deploy Rápido — Innovation.ia ──────────────────────────────────
# Execute na VPS: bash /root/innovation.ia/scripts/deploy_rapido.sh

set -e

cd /root/innovation.ia

echo "════════════════════════════════════════"
echo "  INNOVATION.IA — DEPLOY RÁPIDO"
echo "════════════════════════════════════════"

# 1. Sincronizar código do Git
echo ""
echo "▶ [1/4] Puxando código mais recente do Git..."
git pull origin main || git pull origin master || echo "⚠️  Git pull falhou, usando código local"

# 2. Rebuild e restart backend (api_monolith)
echo ""
echo "▶ [2/4] Rebuild do Backend (api_monolith)..."
cd /root/innovation.ia/ops
docker-compose build --no-cache api_monolith
docker-compose up -d --force-recreate api_monolith

echo "   ⏳ Aguardando backend iniciar (15s)..."
sleep 15

# 3. Verificar se backend está OK
echo ""
echo "▶ [3/4] Verificando saúde do backend..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8005/health || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo "   ✅ Backend OK (HTTP 200)"
else
  echo "   ⚠️  Backend retornou HTTP $HEALTH — verificando logs..."
  docker-compose logs --tail=30 api_monolith
fi

# 4. Rebuild frontend
echo ""
echo "▶ [4/4] Rebuild do Frontend..."
docker-compose build --no-cache frontend
docker-compose up -d --force-recreate frontend

echo ""
echo "════════════════════════════════════════"
echo "  ✅ DEPLOY CONCLUÍDO!"
echo "  Frontend: http://209.50.241.30:3000"
echo "  Backend:  http://209.50.241.30:8005"
echo "════════════════════════════════════════"
echo ""

# Mostrar status final dos containers
docker-compose ps
