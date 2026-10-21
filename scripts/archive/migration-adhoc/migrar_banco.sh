#!/bin/bash
# ─── Migração do banco via Docker — Sem precisar de psql instalado ──────────
# Execute na VPS: bash /root/innovation.ia/scripts/migrar_banco.sh

set -e
cd /root/innovation.ia/ops

echo "════════════════════════════════════"
echo "  MIGRAÇÃO DO BANCO DE DADOS"
echo "════════════════════════════════════"

# ── Wait-for-Postgres: Aguarda o banco estar PRONTO antes de migrar ────────
# Evita race condition em Docker onde o container sobe mas o Postgres
# ainda está inicializando (erro: "Connection refused" no Alembic).
echo "▶ Aguardando PostgreSQL ficar pronto..."
MAX_RETRIES=30
RETRY_INTERVAL=2
RETRIES=0

until docker exec innovation_db pg_isready -U user_N7khBY -d innovation_db -q 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "✗ ERRO: PostgreSQL não respondeu após $((MAX_RETRIES * RETRY_INTERVAL))s. Abortando."
    exit 1
  fi
  echo "  Aguardando... tentativa $RETRIES/$MAX_RETRIES"
  sleep "$RETRY_INTERVAL"
done

echo "✓ PostgreSQL pronto. Iniciando migração..."

# SQL de migração — adiciona colunas faltantes e cria tabelas financeiras
SQL=$(cat <<'ENDSQL'
-- ── Colunas faltantes na tabela users ────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Coluna two_factor_enabled adicionada';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(30);
        RAISE NOTICE 'Coluna phone adicionada';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='current_xp') THEN
        ALTER TABLE users ADD COLUMN current_xp INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna current_xp adicionada';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='level') THEN
        ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
        RAISE NOTICE 'Coluna level adicionada';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
        ALTER TABLE users ADD COLUMN bio TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='skills') THEN
        ALTER TABLE users ADD COLUMN skills TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='experience') THEN
        ALTER TABLE users ADD COLUMN experience TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='education') THEN
        ALTER TABLE users ADD COLUMN education TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='brand_logo') THEN
        ALTER TABLE users ADD COLUMN brand_logo VARCHAR(500);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='brand_color_primary') THEN
        ALTER TABLE users ADD COLUMN brand_color_primary VARCHAR(20) DEFAULT '#820AD1';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='brand_color_secondary') THEN
        ALTER TABLE users ADD COLUMN brand_color_secondary VARCHAR(20) DEFAULT '#0f172a';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='badges') THEN
        ALTER TABLE users ADD COLUMN badges TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='points') THEN
        ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_status') THEN
        ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'inactive';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_plan') THEN
        ALTER TABLE users ADD COLUMN subscription_plan VARCHAR(50) DEFAULT 'starter';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='trial_expires_at') THEN
        ALTER TABLE users ADD COLUMN trial_expires_at TIMESTAMP;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='company_name') THEN
        ALTER TABLE users ADD COLUMN company_name VARCHAR(200);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- ── Tabela cost_centers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_centers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- ── Tabela transactions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    tax_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    due_date TIMESTAMP NOT NULL,
    payment_date TIMESTAMP,
    category VARCHAR(50),
    cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL,
    company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attachment_url VARCHAR(500),
    ai_metadata TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Tabela das_mei ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS das_mei (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cnpj VARCHAR(20),
    competencia VARCHAR(7) NOT NULL,
    valor_das NUMERIC(10,2) NOT NULL DEFAULT 75.60,
    valor_icms NUMERIC(10,2) DEFAULT 0.0,
    valor_iss NUMERIC(10,2) DEFAULT 0.0,
    vencimento DATE NOT NULL,
    codigo_barras VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, competencia)
);

-- ── Índices de performance ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_due ON transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_das_company ON das_mei(company_id);

-- ── Verificação final ─────────────────────────────────────────────────
SELECT 'MIGRAÇÃO CONCLUÍDA!' as status;
SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
ENDSQL
)

echo ""
echo "▶ Executando migração via container Docker..."
docker exec innovation_db psql -U user_N7khBY -d innovation_db -c "$SQL"

echo ""
echo "▶ Verificando tabelas financeiras..."
docker exec innovation_db psql -U user_N7khBY -d innovation_db -c "\dt transactions das_mei cost_centers"

echo ""
echo "════════════════════════════════════"
echo "  ✅ MIGRAÇÃO CONCLUÍDA!"
echo "  Reiniciando backend..."
echo "════════════════════════════════════"

docker-compose restart api_monolith
sleep 8
echo ""
echo "▶ Status do backend após migração:"
docker logs innovation_api_monolith --tail 15 2>&1

echo ""
echo "▶ Teste rápido do health check:"
curl -s http://localhost:8005/health
echo ""
