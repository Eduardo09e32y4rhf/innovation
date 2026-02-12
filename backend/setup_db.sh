#!/bin/bash

echo "🚀 Configurando banco de dados..."

# Garantir que estamos no diretório correto (innovation)
cd "$(dirname "$0")/innovation" 2>/dev/null || cd innovation

echo "1️⃣ Criando tabelas..."
python -c "from app.db.init_db import init_database; init_database()"

echo "2️⃣ Populando dados de exemplo..."
python app.db.seed

echo "✅ Pronto! Banco configurado."
echo ""
echo "🔑 Use estas credenciais:"
echo "  Admin: admin@innovation.ia / admin123"
echo "  Empresa: empresa1@test.com / senha123"
echo "  Candidato: candidato1@test.com / senha123"
