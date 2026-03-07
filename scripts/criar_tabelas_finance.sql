-- Script para criar as tabelas do módulo financeiro
-- Execute na VPS: psql -U user_N7khBY -h 209.50.241.30 -d innovation_db -f criar_tabelas_finance.sql

-- Tabela de centros de custo (necessária antes de transactions por FK)
CREATE TABLE IF NOT EXISTS cost_centers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela principal de transações financeiras
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,           -- 'income' | 'expense'
    tax_type VARCHAR(20),                -- 'DAS', 'INSS', 'FGTS', etc.
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'paid' | 'overdue' | 'cancelled'
    due_date TIMESTAMP NOT NULL,
    payment_date TIMESTAMP,
    category VARCHAR(50),
    cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL,
    company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attachment_url VARCHAR(500),
    ai_metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de DAS MEI (para dados reais do governo)
CREATE TABLE IF NOT EXISTS das_mei (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cnpj VARCHAR(20),
    competencia VARCHAR(7) NOT NULL,     -- 'YYYY-MM'
    valor NUMERIC(10, 2) NOT NULL DEFAULT 75.60,
    vencimento DATE NOT NULL,
    codigo_barras VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'paid' | 'overdue'
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, competencia)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_das_mei_company_id ON das_mei(company_id);

SELECT 'Tabelas financeiras criadas com sucesso!' AS resultado;
SELECT COUNT(*) AS total_transacoes FROM transactions;
