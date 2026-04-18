#!/bin/bash
# ==============================================================================
# Innovation.ia — Deploy Completo no VPS
# Domínio: vps8369.panel.icontainer.net
# Execute este script no terminal web do painel icontainer
# ==============================================================================

set -e
DOMAIN="vps8369.panel.icontainer.net"
APP_DIR="/opt/innovation"
REPO_URL=""  # Opcional: se tiver no GitHub

echo "╔══════════════════════════════════════════════════════════╗"
echo "║    Innovation.ia — Deploy VPS iContainer                 ║"
echo "╚══════════════════════════════════════════════════════════╝"

# ── VERIFICAR ROOT ────────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo "❌ Execute como root: sudo bash deploy_vps_completo.sh"
  exit 1
fi

# ── INSTALAR DEPENDÊNCIAS DO SISTEMA ─────────────────────────────────────────
echo ""
echo "📦 Atualizando sistema e instalando dependências..."
apt-get update -qq
apt-get install -y \
  curl wget git unzip \
  python3 python3-pip python3-venv \
  nodejs npm \
  nginx \
  postgresql postgresql-contrib \
  redis-server \
  supervisor \
  certbot python3-certbot-nginx \
  build-essential libpq-dev \
  2>/dev/null

# ── NODE.JS 20 (LTS) ─────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
  echo "📦 Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node.js: $(node -v) | NPM: $(npm -v)"

# ── CRIAR ESTRUTURA DE DIRETÓRIOS ─────────────────────────────────────────────
echo ""
echo "📁 Criando diretórios em $APP_DIR..."
mkdir -p $APP_DIR/{backend,frontend,logs}
cd $APP_DIR

# ── POSTGRESQL ────────────────────────────────────────────────────────────────
echo ""
echo "🗄️  Configurando PostgreSQL..."
service postgresql start || systemctl start postgresql 2>/dev/null || true
sleep 2

DB_NAME="innovation_db"
DB_USER="innovation_user"
DB_PASS="Innov@2026#Secure"

# Criar usuário e banco se não existir
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;" 2>/dev/null || true

DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
echo "✅ PostgreSQL configurado: $DATABASE_URL"

# ── REDIS ─────────────────────────────────────────────────────────────────────
echo ""
echo "🔴 Iniciando Redis..."
service redis-server start || systemctl start redis 2>/dev/null || true
echo "✅ Redis rodando"

# ── BACKEND (FastAPI) ─────────────────────────────────────────────────────────
echo ""
echo "🐍 Configurando Backend Python/FastAPI..."
BACKEND_DIR="$APP_DIR/backend"

# Criar ambiente virtual
python3 -m venv $BACKEND_DIR/venv 2>/dev/null || true
source $BACKEND_DIR/venv/bin/activate

# Se requirements.txt já existe (upload manual)
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
  pip install -q -r $BACKEND_DIR/requirements.txt
  echo "✅ Dependências Python instaladas"
else
  echo "⚠️  Faça upload do código antes de continuar"
fi

# Criar .env de produção para o backend
cat > $BACKEND_DIR/.env << ENVEOF
# Innovation.ia — Produção
DATABASE_URL=$DATABASE_URL
SECRET_KEY=831941797998941081b75436b8e3e4b242d85a899f1972cd4e5bf9769b782287
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

# Gemini AI
GEMINI_API_KEYS=AIzaSyD9ejCdvSK5_oGIOKUCJgkBngNvWKGhwQo,AIzaSyB6zkN15EhGmDB0LpzEQu0ZpD58nlZ_Z0I,AIzaSyAlaIksHsbP6kLxRC3A0xSXDfX6yJNGDlM,AIzaSyBnTZrwN_LTSYElQCqDRf8vMtn_Q06feBc
GEMINI_API_KEY_1=AIzaSyD9ejCdvSK5_oGIOKUCJgkBngNvWKGhwQo
GEMINI_API_KEY_2=AIzaSyB6zkN15EhGmDB0LpzEQu0ZpD58nlZ_Z0I
GEMINI_API_KEY_3=AIzaSyAlaIksHsbP6kLxRC3A0xSXDfX6yJNGDlM
GEMINI_API_KEY_4=AIzaSyBnTZrwN_LTSYElQCqDRf8vMtn_Q06feBc

# Pagamentos Asaas (sandbox)
ASAAS_API_KEY=\$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmUzMTU5NThmLTQ2NzgtNDY1ZS1iNmFhLTY3MjI0MThmNDFjYjo6JGFhY2hfNDY4NzgzMjMtZmIyNC00MDc2LThkMjAtNzRiNzJmYTA2Y2M1
ASAAS_API_URL=https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=14d0bc33899dca7568702cbaefc07aaca87398b5633e36c89524b0c6924d5793
ASAAS_WEBHOOK_URL=https://$DOMAIN/api/finance/webhooks/asaas

# Redis
REDIS_URL=redis://localhost:6379/0

# App
APP_ENV=production
DEBUG=false
LOG_LEVEL=INFO
BASE_URL=https://$DOMAIN
ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN
ENVEOF

echo "✅ .env backend criado"
deactivate

# ── FRONTEND (Next.js) ────────────────────────────────────────────────────────
echo ""
echo "⚡ Configurando Frontend Next.js..."
FRONTEND_DIR="$APP_DIR/frontend"

# Criar .env.production para o frontend
cat > $FRONTEND_DIR/.env.production << ENVEOF
NEXT_PUBLIC_API_URL=https://$DOMAIN
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyAlaIksHsbP6kLxRC3A0xSXDfX6yJNGDlM
NEXT_PUBLIC_SUPABASE_URL=mock_url_until_replaced
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock_key_until_replaced
ENVEOF

if [ -f "$FRONTEND_DIR/package.json" ]; then
  cd $FRONTEND_DIR
  npm install --production=false
  npm run build
  echo "✅ Frontend compilado!"
  cd $APP_DIR
else
  echo "⚠️  Faça upload do frontend antes de continuar"
fi

# ── SUPERVISOR (Process Manager) ─────────────────────────────────────────────
echo ""
echo "⚙️  Configurando Supervisor para gerenciar processos..."

# Backend config
cat > /etc/supervisor/conf.d/innovation-backend.conf << SUPEOF
[program:innovation-backend]
command=$BACKEND_DIR/venv/bin/gunicorn -w 2 -k uvicorn.workers.UvicornWorker api.main:app --bind 0.0.0.0:8000 --timeout 120
directory=$BACKEND_DIR
user=root
autostart=true
autorestart=true
stderr_logfile=$APP_DIR/logs/backend-error.log
stdout_logfile=$APP_DIR/logs/backend-out.log
environment=PYTHONPATH="$BACKEND_DIR/src:$BACKEND_DIR"
SUPEOF

# Frontend config
cat > /etc/supervisor/conf.d/innovation-frontend.conf << SUPEOF
[program:innovation-frontend]
command=node $FRONTEND_DIR/.next/standalone/server.js
directory=$FRONTEND_DIR
user=root
autostart=true
autorestart=true
stderr_logfile=$APP_DIR/logs/frontend-error.log
stdout_logfile=$APP_DIR/logs/frontend-out.log
environment=PORT="3000",HOSTNAME="0.0.0.0",NODE_ENV="production"
SUPEOF

supervisorctl reread
supervisorctl update
echo "✅ Supervisor configurado"

# ── NGINX ─────────────────────────────────────────────────────────────────────
echo ""
echo "🌐 Configurando Nginx como proxy reverso..."

cat > /etc/nginx/sites-available/innovation << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend (Next.js) na raiz
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 60;
        client_max_body_size 50M;
    }

    # Docs FastAPI
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host \$host;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }

    # Static files Next.js
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000/_next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    client_max_body_size 50M;
}
NGINXEOF

# Ativar site
ln -sf /etc/nginx/sites-available/innovation /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Testar e recarregar nginx
nginx -t && service nginx reload || systemctl reload nginx
echo "✅ Nginx configurado"

# ── MIGRATE BANCO ─────────────────────────────────────────────────────────────
echo ""
echo "🗄️  Rodando migrações do banco..."
cd $BACKEND_DIR
source venv/bin/activate
export DATABASE_URL="$DATABASE_URL"
python -c "
from src.core.database import engine, Base
try:
    Base.metadata.create_all(bind=engine)
    print('✅ Tabelas criadas com sucesso!')
except Exception as e:
    print(f'⚠️  Erro ao criar tabelas: {e}')
" 2>/dev/null || echo "⚠️  Migração via alembic necessária"

# Tentar alembic se disponível
if [ -f "alembic.ini" ]; then
  alembic upgrade head 2>/dev/null && echo "✅ Alembic migrations aplicadas" || echo "⚠️  Erro no alembic"
fi

echo "👤 Criando usuário admin inicial..."
python seed_root_user.py 2>/dev/null && echo "✅ Usuário admin criado" || echo "⚠️ Usuário admin possivelmente já existe ou houve erro."
deactivate
cd $APP_DIR

# ── INICIAR SERVIÇOS ─────────────────────────────────────────────────────────
echo ""
echo "🚀 Iniciando todos os serviços..."
supervisorctl start innovation-backend 2>/dev/null || true
supervisorctl start innovation-frontend 2>/dev/null || true

sleep 3

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║    ✅ Deploy Concluído!                                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Acesse: http://$DOMAIN"
echo "📊 API Docs: http://$DOMAIN/docs"
echo ""
echo "📋 Status dos serviços:"
supervisorctl status
echo ""
echo "📋 Nginx status:"
service nginx status | head -5 || systemctl status nginx | head -5
