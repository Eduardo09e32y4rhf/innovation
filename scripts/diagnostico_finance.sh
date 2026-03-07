#!/bin/bash
# Diagnóstico completo do backend financeiro
echo "====== LOGS DO BACKEND (últimas 50 linhas) ======"
docker logs innovation_api_monolith --tail 50 2>&1

echo ""
echo "====== TESTE DIRETO NO CONTAINER (sem gateway) ======"
# Criar token temporário e testar endpoint
TOKEN=$(docker exec innovation_api_monolith python3 -c "
import sys
sys.path.insert(0, '/app/backend/src')
import os
os.environ.setdefault('DATABASE_URL', 'postgresql://user_N7khBY:password_Zs6bid@209.50.241.30:5432/innovation_db')
os.environ.setdefault('SECRET_KEY', '${SECRET_KEY:-secret}')
from core.security.jwt import create_access_token
print(create_access_token({'sub': 'admin@innovation.ia', 'role': 'admin', 'user_id': 1}))
" 2>/dev/null || echo "FALHOU_TOKEN")

echo "Token gerado: ${TOKEN:0:40}..."

echo ""
echo "====== VERIFICAR SE TABELA transactions EXISTE ======"
PGPASSWORD=password_Zs6bid psql -U user_N7khBY -h 209.50.241.30 -d innovation_db -c "\dt transactions" 2>&1
PGPASSWORD=password_Zs6bid psql -U user_N7khBY -h 209.50.241.30 -d innovation_db -c "SELECT COUNT(*) as total FROM transactions;" 2>&1 || echo "TABELA NÃO EXISTE!"

echo ""
echo "====== TESTAR ENDPOINT COM CURL DIRETO ======"
if [ "$TOKEN" != "FALHOU_TOKEN" ] && [ -n "$TOKEN" ]; then
    curl -s -X GET "http://localhost:8005/api/finance/transactions" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" 2>&1
else
    echo "Não foi possível gerar token, testando sem auth..."
    curl -s -X GET "http://localhost:8005/api/finance/transactions" 2>&1
fi

echo ""
echo "====== FIM DO DIAGNÓSTICO ======"
