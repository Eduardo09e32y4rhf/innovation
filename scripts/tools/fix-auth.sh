#!/bin/bash
set -euo pipefail

: "${ADMIN_PASSWORD:?Defina ADMIN_PASSWORD antes de rodar este script}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/root/innovation_ia"
cd "$PROJECT_DIR" || { echo -e "${RED}Erro: diretorio $PROJECT_DIR nao encontrado${NC}"; exit 1; }

if [ ! -f "docker-compose.microservices.yml" ]; then
  echo -e "${RED}Erro: docker-compose.microservices.yml nao encontrado${NC}"
  exit 1
fi

echo -e "${YELLOW}Passo 1: parando containers e limpando volumes${NC}"
docker compose -f docker-compose.microservices.yml down -v

echo -e "${YELLOW}Passo 2: rebuild auth_service sem cache${NC}"
docker compose -f docker-compose.microservices.yml build --no-cache auth_service

echo -e "${YELLOW}Passo 3: subindo infraestrutura${NC}"
docker compose -f docker-compose.microservices.yml up -d

echo -e "${YELLOW}Passo 4: aguardando auto-healing${NC}"
sleep 15

echo -e "${YELLOW}Passo 5: status dos containers${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "${YELLOW}Passo 6: health check auth_service${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health)
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}Auth service healthy${NC}"
else
  echo -e "${RED}Auth service HTTP $HTTP_CODE. Logs:${NC}"
  docker logs auth_service --tail 20
fi

echo -e "${YELLOW}Passo 7: verificando usuarios${NC}"
curl -s http://localhost:8001/debug/users

echo -e "${YELLOW}Passo 8: testando login do admin${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8001/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@innovation.ia\",\"password\":\"${ADMIN_PASSWORD}\"}")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo -e "${GREEN}Login do admin funcionou.${NC}"
else
  echo -e "${RED}Erro no login do admin. Verifique os logs do container.${NC}"
fi

echo "Processo concluido. Senha: definida em ADMIN_PASSWORD."