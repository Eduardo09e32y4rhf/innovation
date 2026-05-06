#!/bin/bash

# ==========================================
# INNOVATION.IA - FIX AUTH SCRIPT
# Script para corrigir autenticação de uma vez
# ==========================================

echo "🚀 Innovation.ia - Correção de Autenticação"
echo "============================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Caminho do projeto
PROJECT_DIR="/root/innovation_ia"

# Entrar no diretório
cd $PROJECT_DIR || { echo -e "${RED}❌ Erro: Diretório $PROJECT_DIR não encontrado${NC}"; exit 1; }

# Verificar se está no diretório correto
if [ ! -f "docker-compose.microservices.yml" ]; then
    echo -e "${RED}❌ Erro: docker-compose.microservices.yml não encontrado${NC}"
    exit 1
fi

echo -e "${YELLOW}📝 Passo 1: Parando todos os containers e limpando volumes (Garante reset do DB)...${NC}"
docker compose -f docker-compose.microservices.yml down -v
echo -e "${GREEN}✅ Containers parados e volumes limpos${NC}"
echo ""

echo -e "${YELLOW}🔨 Passo 2: Rebuilding auth_service (sem cache para aplicar novo código)...${NC}"
docker compose -f docker-compose.microservices.yml build --no-cache auth_service
echo -e "${GREEN}✅ Auth service rebuilt${NC}"
echo ""

echo -e "${YELLOW}🚀 Passo 3: Subindo a infraestrutura...${NC}"
docker compose -f docker-compose.microservices.yml up -d
echo -e "${GREEN}✅ Serviços iniciados${NC}"
echo ""

echo -e "${YELLOW}⏳ Passo 4: Aguardando o Auto-Healing (Criar tabelas e Admin)...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}🔍 Passo 5: Verificando status dos containers...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo -e "${YELLOW}🏥 Passo 6: Testando health check do auth_service...${NC}"
# Tenta testar localmente no servidor
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Auth service está healthy!${NC}"
else
    echo -e "${RED}❌ Auth service (HTTP $HTTP_CODE) - Verificando logs...${NC}"
    docker logs auth_service --tail 20
fi
echo ""

echo -e "${YELLOW}👥 Passo 7: Verificando se o Admin foi criado...${NC}"
curl -s http://localhost:8001/debug/users
echo ""

echo -e "${YELLOW}🔐 Passo 8: Testando login do admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8001/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@innovation.ia","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✅ Login do admin funcionou perfeitamente!${NC}"
else
    echo -e "${RED}❌ Erro no login do admin. Verifique os logs do container.${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 PROCESSO CONCLUÍDO!${NC}"
echo "🌐 Acesse: http://187.77.49.207/login"
echo "📧 Email: admin@innovation.ia"
echo "🔑 Senha: admin123"
echo "============================================"
