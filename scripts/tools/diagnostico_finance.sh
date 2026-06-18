#!/bin/bash
# Diagnostico do backend financeiro sem credenciais hardcoded.
set -euo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL antes de rodar este diagnostico}"
: "${SECRET_KEY:?Defina SECRET_KEY antes de rodar este diagnostico}"
: "${PGHOST:?Defina PGHOST antes de rodar este diagnostico}"
: "${PGUSER:?Defina PGUSER antes de rodar este diagnostico}"
: "${PGDATABASE:?Defina PGDATABASE antes de rodar este diagnostico}"
: "${PGPASSWORD:?Defina PGPASSWORD antes de rodar este diagnostico}"

echo "====== LOGS DO BACKEND (ultimas 50 linhas) ======"
docker logs innovation_api_monolith --tail 50 2>&1

echo ""
echo "====== TESTE DIRETO NO CONTAINER (sem gateway) ======"
TOKEN=$(docker exec \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SECRET_KEY="$SECRET_KEY" \
  innovation_api_monolith python3 -c "
import sys
sys.path.insert(0, '/app/backend/src')
from core.security.jwt import create_access_token
print(create_access_token({'sub': 'admin@innovation.ia', 'role': 'admin', 'user_id': 1}))
" 2>/dev/null || echo "FALHOU_TOKEN")

echo "Token gerado: ${TOKEN:0:40}..."

echo ""
echo "====== VERIFICAR SE TABELA transactions EXISTE ======"
psql -c "\dt transactions" 2>&1
psql -c "SELECT COUNT(*) as total FROM transactions;" 2>&1 || echo "TABELA NAO EXISTE!"

echo ""
echo "====== TESTAR ENDPOINT COM CURL DIRETO ======"
if [ "$TOKEN" != "FALHOU_TOKEN" ] && [ -n "$TOKEN" ]; then
  curl -s -X GET "http://localhost:8005/api/finance/transactions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" 2>&1
else
  echo "Nao foi possivel gerar token, testando sem auth..."
  curl -s -X GET "http://localhost:8005/api/finance/transactions" 2>&1
fi

echo ""
echo "====== FIM DO DIAGNOSTICO ======"