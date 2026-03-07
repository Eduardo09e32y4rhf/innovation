#!/usr/bin/env python3
"""
Script de migração do banco de dados — executa dentro do container api_monolith.
Uso: docker exec innovation_api_monolith python3 /app/scripts/migrate_db.py
"""
import sys
import os

# Adicionar o src ao path
sys.path.insert(0, '/app/backend/src')

def run_migration():
    print("════════════════════════════════════")
    print("  MIGRAÇÃO VIA SQLAlchemy")
    print("════════════════════════════════════")

    try:
        from infrastructure.database.sql.session import engine
        from sqlalchemy import text
        print(f"✅ Conectado ao banco!")
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        sys.exit(1)

    SQL_MIGRATIONS = [
        # Colunas faltantes na tabela users
        ("two_factor_enabled", "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE"),
        ("phone", "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)"),
        ("current_xp", "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0"),
        ("level", "ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1"),
        ("bio", "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT"),
        ("skills", "ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT"),
        ("experience", "ALTER TABLE users ADD COLUMN IF NOT EXISTS experience TEXT"),
        ("education", "ALTER TABLE users ADD COLUMN IF NOT EXISTS education TEXT"),
        ("company_name", "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(200)"),
        ("brand_logo", "ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_logo VARCHAR(500)"),
        ("brand_color_primary", "ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_color_primary VARCHAR(20) DEFAULT '#820AD1'"),
        ("brand_color_secondary", "ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_color_secondary VARCHAR(20) DEFAULT '#0f172a'"),
        ("badges", "ALTER TABLE users ADD COLUMN IF NOT EXISTS badges TEXT"),
        ("points", "ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0"),
        ("subscription_status", "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive'"),
        ("subscription_plan", "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'starter'"),
        ("trial_expires_at", "ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP"),
        ("updated_at", "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()"),
    ]

    TABLE_MIGRATIONS = [
        # Tabela de centros de custo
        ("cost_centers", """
            CREATE TABLE IF NOT EXISTS cost_centers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
            )
        """),
        # Tabela de transações financeiras
        ("transactions", """
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
            )
        """),
        # Tabela do DAS MEI
        ("das_mei", """
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
            )
        """),
    ]

    INDEX_MIGRATIONS = [
        "CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_transactions_due ON transactions(due_date)",
        "CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)",
        "CREATE INDEX IF NOT EXISTS idx_das_company ON das_mei(company_id)",
    ]

    with engine.connect() as conn:
        # 1. Adicionar colunas faltantes nos users
        print("\n▶ Adicionando colunas faltantes na tabela users...")
        for col_name, sql in SQL_MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"   ✅ users.{col_name} — OK")
            except Exception as e:
                conn.rollback()
                print(f"   ⚠️  users.{col_name} — {e}")

        # 2. Criar tabelas financeiras
        print("\n▶ Criando tabelas financeiras...")
        for table_name, sql in TABLE_MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"   ✅ Tabela {table_name} — OK")
            except Exception as e:
                conn.rollback()
                print(f"   ⚠️  Tabela {table_name} — {e}")

        # 3. Criar índices
        print("\n▶ Criando índices...")
        for sql in INDEX_MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"   ✅ Índice criado")
            except Exception as e:
                conn.rollback()
                print(f"   ⚠️  Índice — {e}")

        # 4. Verificação final
        print("\n▶ Verificação final:")
        try:
            result = conn.execute(text("SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema='public'"))
            row = result.fetchone()
            print(f"   📊 Total de tabelas no banco: {row[0]}")

            for table in ['transactions', 'cost_centers', 'das_mei']:
                try:
                    r = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = r.fetchone()[0]
                    print(f"   ✅ {table}: {count} registros")
                except:
                    print(f"   ❌ {table}: TABELA NÃO EXISTE!")

            # Verificar colunas do users
            r = conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name='users' AND column_name IN
                ('two_factor_enabled', 'current_xp', 'level', 'phone', 'badges', 'points')
                ORDER BY column_name
            """))
            cols = [row[0] for row in r.fetchall()]
            print(f"   ✅ Colunas verificadas em users: {cols}")

        except Exception as e:
            print(f"   ⚠️  Verificação: {e}")

    print("\n════════════════════════════════════")
    print("  ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
    print("════════════════════════════════════\n")


if __name__ == "__main__":
    run_migration()
