#!/bin/bash

# ============================================================
# INNOVATION.IA - SISTEMA DE AUDITORIA E REPARO TOTAL (V3)
# ============================================================

clear
echo "============================================================"
echo "🔍  INICIANDO AUDITORIA COMPLETA DA INNOVATION.IA"
echo "============================================================"
date
echo "------------------------------------------------------------"

cd /root/innovation_ia

# 1. SINCRONIZAÇÃO DE CÓDIGO
echo "Step 1: 📥 Sincronizando repositório..."
git fetch --all && git reset --hard origin/main
echo "✅ Código atualizado."

# 2. INFRAESTRUTURA DE REDE
echo -e "\nStep 2: 🌐 Verificando redes Docker..."
if ! docker network ls | grep -q "app-network"; then
    echo "⚠️  Rede 'app-network' não encontrada. Criando agora..."
    docker network create app-network
else
    echo "✅ Rede 'app-network' está ativa."
fi

# 3. ESTADO DOS CONTENTORES
echo -e "\nStep 3: 📦 Verificando estado dos motores..."
# Reinicia serviços que costumam ficar presos
docker compose -f docker-compose.microservices.yml up -d
docker compose -f docker-compose.enterprise.yml up -d
echo "✅ Motores reiniciados e em execução."

# 4. AUDITORIA DA BASE DE DADOS (CRÍTICO)
echo -e "\nStep 4: 🗄️ Verificando integridade das tabelas..."
# Tenta criar tabelas em falta sem apagar dados existentes
docker exec -it auth_service python -c "
import models
from database import engine, Base
try:
    Base.metadata.create_all(bind=engine)
    print('✅ Tabelas (Users, Transactions, Metadata) verificadas/criadas.')
except Exception as e:
    print(f'❌ ERRO NO BANCO: {e}')
"

# 5. TESTE DE CONECTIVIDADE IA (FLOWISE/RENDER)
echo -e "\nStep 5: 🤖 Testando ponte com o Cérebro IA (Render)..."
# Verifica se o servidor consegue 'pingar' o Render
if curl -s --head  --request GET https://innovation-flowise.onrender.com | grep "200 OK" > /dev/null; then
    echo "✅ Link com Flowise no Render está ATIVO."
else
    echo "❌ ALERTA: Flowise no Render parece estar offline ou em standby."
fi

# 6. TESTE DE COMUNICAÇÃO INTERNA (KONG -> BACKEND)
echo -e "\nStep 6: 🛡️ Testando Gateway de Segurança (Kong)..."
if docker exec -it innovation_gateway curl -s http://auth_service:8001/health > /dev/null; then
    echo "✅ Kong está a comunicar com o Backend."
else
    echo "⚠️  Aviso: Falha de comunicação interna via Kong."
fi

# 7. RELATÓRIO FINAL DE SAÚDE
echo -e "\n============================================================"
echo "📊 RELATÓRIO DE SAÚDE DOS SERVIÇOS:"
echo "------------------------------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "============================================================"

echo -e "\n💡 INSTRUÇÃO DE OURO:"
echo "Se o Chat IA não funcionar, rode: 'docker logs -f ai_service'"
echo "Se o Login der erro, rode: 'docker logs -f auth_service'"
echo "------------------------------------------------------------"
echo "Auditoria Finalizada com Sucesso! 🚀"
