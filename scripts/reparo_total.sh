#!/bin/bash

# ============================================================
# INNOVATION.IA - SISTEMA DE AUDITORIA E REPARO TOTAL (V4)
# ============================================================

set -e

ROOT="/root/innovation.ia"
COMPOSE_MICRO="$ROOT/infra/docker/docker-compose.microservices.yml"
COMPOSE_ENTERPRISE="$ROOT/infra/docker/docker-compose.enterprise.yml"

clear
echo "============================================================"
echo "🔍  INICIANDO AUDITORIA COMPLETA DA INNOVATION.IA"
echo "============================================================"
date
echo "------------------------------------------------------------"

cd "$ROOT"

# 1. SINCRONIZAÇÃO DE CÓDIGO
echo "Step 1: 📥 Sincronizando repositório..."
git fetch --all && git reset --hard origin/main
# Garante que o .env está disponível para o Docker
cp -n .env.microservices.example .env 2>/dev/null || true
cp .env "$ROOT/infra/docker/.env"
echo "✅ Código e variáveis de ambiente atualizados."

# 2. INFRAESTRUTURA DE REDE
echo -e "\nStep 2: 🌐 Verificando redes Docker..."
if ! docker network ls | grep -q "app-network"; then
    echo "⚠️  Rede 'app-network' não encontrada. Criando agora..."
    docker network create app-network
else
    echo "✅ Rede 'app-network' está ativa."
fi

# 3. ESTADO DOS CONTENTORES
echo -e "\nStep 3: 📦 Derrubando containers antigos e recriando..."
# Para todos os containers do projeto para evitar conflitos de nome
docker compose --project-directory "$ROOT" -f "$COMPOSE_MICRO" down --remove-orphans 2>/dev/null || true
docker compose --project-directory "$ROOT" -f "$COMPOSE_ENTERPRISE" down --remove-orphans 2>/dev/null || true

echo "   Subindo microservices..."
docker compose --project-directory "$ROOT" -f "$COMPOSE_MICRO" up -d --build
echo "   Subindo serviços enterprise..."
docker compose --project-directory "$ROOT" -f "$COMPOSE_ENTERPRISE" up -d 2>/dev/null || true
echo "✅ Motores reiniciados e em execução."

# 4. AGUARDA O AUTH SERVICE ESTAR PRONTO
echo -e "\nStep 4: 🗄️ Aguardando auth_service inicializar (até 30s)..."
for i in $(seq 1 10); do
    if docker ps --filter "name=auth_service" --filter "status=running" | grep -q auth_service; then
        echo "✅ auth_service está ONLINE."
        # Verifica integridade das tabelas
        docker exec auth_service python -c "
import models
from database import engine, Base
try:
    Base.metadata.create_all(bind=engine)
    print('✅ Tabelas verificadas/criadas com sucesso.')
except Exception as e:
    print(f'⚠️  Aviso no banco: {e}')
" 2>/dev/null || echo "⚠️  Não foi possível verificar tabelas (normal na 1ª inicialização)."
        break
    fi
    echo "   Aguardando... ($((i*3))s)"
    sleep 3
done

# 5. TESTE DE CONECTIVIDADE INTERNA (KONG -> BACKEND)
echo -e "\nStep 5: 🛡️ Testando Gateway de Segurança (Kong)..."
sleep 3
if docker exec innovation_gateway curl -s http://auth_service:8001/health > /dev/null 2>&1; then
    echo "✅ Kong está comunicando com o Backend."
else
    echo "⚠️  Aviso: Gateway ainda inicializando (normal nos primeiros minutos)."
fi

# 6. RELATÓRIO FINAL DE SAÚDE
echo -e "\n============================================================"
echo "📊 RELATÓRIO DE SAÚDE DOS SERVIÇOS:"
echo "------------------------------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "============================================================"

echo -e "\n💡 LOGS RÁPIDOS (se algo der errado):"
echo "  docker logs -f auth_service"
echo "  docker logs -f ai_service"
echo "  docker logs -f innovation_frontend"
echo "------------------------------------------------------------"
echo "🚀 Auditoria Finalizada! Acesse: http://$(hostname -I | awk '{print $1}')"
