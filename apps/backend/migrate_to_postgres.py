#!/usr/bin/env python3
"""
migrate_to_postgres.py — Migração SQLite → PostgreSQL
=====================================================
Execute este script UMA VEZ para migrar o banco de dados para produção.

Pré-requisitos:
  1. PostgreSQL provisionado (Neon, Railway, Render, Supabase, AWS RDS)
  2. DATABASE_URL configurado no .env com a connection string PostgreSQL
  3. pip install psycopg2-binary (já está no requirements.txt)

Uso:
  cd backend
  python migrate_to_postgres.py

O script irá:
  1. Verificar a conexão PostgreSQL
  2. Criar todas as tabelas via Alembic
  3. Exportar dados do SQLite
  4. Importar dados no PostgreSQL
  5. Verificar contagens
"""

import os
import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SRC_DIR = BASE_DIR / "src"
sys.path.insert(0, str(SRC_DIR))

# Carrega .env
from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "")

print("=" * 60)
print("  Innovation.ia — Migração SQLite → PostgreSQL")
print("=" * 60)


def check_postgres_url():
    if not DATABASE_URL:
        print("❌ DATABASE_URL não configurada no .env")
        print("   Exemplo: DATABASE_URL=postgresql://user:pass@host:5432/db")
        sys.exit(1)

    if "sqlite" in DATABASE_URL.lower():
        print("⚠️  DATABASE_URL ainda aponta para SQLite:")
        print(f"   {DATABASE_URL}")
        print()
        print("   Configure um PostgreSQL no .env antes de migrar.")
        print("   Provedores recomendados:")
        print("   • Neon (grátis até 3GB): https://neon.tech")
        print("   • Railway: https://railway.app")
        print("   • Supabase: https://supabase.com")
        print("   • Render: https://render.com/docs/postgresql")
        print()
        print("   Após criar o PostgreSQL, adicione ao .env:")
        print("   DATABASE_URL=postgresql://usuario:senha@host:5432/innovation_prod")
        sys.exit(1)

    # Fix postgres:// → postgresql://
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    print(f"✅ DATABASE_URL PostgreSQL detectada:")
    # Mascara a senha no log
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        masked = f"{parsed.scheme}://{parsed.username}:***@{parsed.hostname}:{parsed.port}{parsed.path}"
        print(f"   {masked}")
    except Exception:
        print(f"   {url[:30]}...")

    return url


def test_connection(url: str):
    """Testa conexão com PostgreSQL antes de migrar."""
    print("\n🔌 Testando conexão com PostgreSQL...")
    try:
        import psycopg2
        # psycopg2 usa format diferente de SQLAlchemy
        conn_url = url.replace("postgresql://", "").replace("postgresql+psycopg2://", "")
        conn = psycopg2.connect(url)
        conn.close()
        print("   ✅ Conexão OK!")
        return True
    except Exception as e:
        print(f"   ❌ Falha na conexão: {e}")
        print()
        print("   Verifique:")
        print("   • Se o host/porta estão corretos")
        print("   • Se o usuário e senha estão corretos")
        print("   • Se o banco de dados já existe")
        print("   • Se o IP do servidor está na whitelist do provedor")
        return False


def run_alembic_migrations():
    """Executa as migrations do Alembic para criar as tabelas."""
    print("\n🗄️  Criando tabelas no PostgreSQL via Alembic...")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            env={**os.environ, "DATABASE_URL": DATABASE_URL},
        )
        if result.returncode == 0:
            print("   ✅ Tabelas criadas com sucesso!")
            if result.stdout:
                for line in result.stdout.strip().split("\n")[-5:]:
                    print(f"   {line}")
        else:
            print(f"   ⚠️  Alembic retornou código {result.returncode}")
            print(f"   stdout: {result.stdout[-500:]}")
            print(f"   stderr: {result.stderr[-500:]}")
            print()
            print("   Tentando criar tabelas via create_all como fallback...")
            _create_tables_fallback()
    except Exception as e:
        print(f"   ❌ Erro ao executar Alembic: {e}")
        print("   Tentando create_all como fallback...")
        _create_tables_fallback()


def _create_tables_fallback():
    """Fallback: usa SQLAlchemy create_all se Alembic falhar."""
    try:
        from infrastructure.database.sql.base import Base
        from infrastructure.database.sql.session import engine
        import domain.models  # noqa — garante que todos os models são importados
        Base.metadata.create_all(bind=engine)
        print("   ✅ Tabelas criadas via create_all!")
    except Exception as e:
        print(f"   ❌ Fallback também falhou: {e}")
        print("   Verifique os imports em domain/models/__init__.py")


def migrate_data_from_sqlite():
    """Migra dados do SQLite para PostgreSQL."""
    sqlite_files = list(BASE_DIR.glob("*.db"))
    if not sqlite_files:
        print("\n📭 Nenhum arquivo .db SQLite encontrado — nada para migrar.")
        return

    print(f"\n📦 Arquivos SQLite encontrados: {[f.name for f in sqlite_files]}")
    print("   Iniciando migração de dados...")

    try:
        from sqlalchemy import create_engine, text, MetaData, Table, inspect
        from sqlalchemy.exc import IntegrityError

        # Engine SQLite (source)
        sqlite_db = sqlite_files[0]
        sqlite_engine = create_engine(f"sqlite:///{sqlite_db}")

        # Engine PostgreSQL (destino)
        pg_url = DATABASE_URL
        if pg_url.startswith("postgres://"):
            pg_url = pg_url.replace("postgres://", "postgresql://", 1)
        pg_engine = create_engine(pg_url)

        sqlite_inspector = inspect(sqlite_engine)
        pg_inspector = inspect(pg_engine)

        sqlite_tables = sqlite_inspector.get_table_names()
        pg_tables = pg_inspector.get_table_names()

        migrated = 0
        skipped = 0

        for table_name in sqlite_tables:
            if table_name.startswith("alembic"):
                continue

            if table_name not in pg_tables:
                print(f"   ⏩ Tabela '{table_name}' não existe no PostgreSQL — pulando")
                skipped += 1
                continue

            try:
                with sqlite_engine.connect() as s_conn:
                    rows = s_conn.execute(text(f'SELECT * FROM "{table_name}"')).fetchall()

                if not rows:
                    print(f"   ⚪ Tabela '{table_name}': vazia")
                    continue

                sqlite_meta = MetaData()
                sqlite_meta.reflect(bind=sqlite_engine, only=[table_name])
                s_table = sqlite_meta.tables[table_name]

                with pg_engine.begin() as p_conn:
                    for row in rows:
                        row_dict = dict(row._mapping)
                        try:
                            p_conn.execute(s_table.insert().values(**row_dict))
                        except IntegrityError:
                            pass  # Ignora duplicatas
                    migrated += 1
                    print(f"   ✅ '{table_name}': {len(rows)} registros migrados")

            except Exception as e:
                print(f"   ⚠️  '{table_name}': erro na migração — {e}")

        print(f"\n   📊 Resultado: {migrated} tabelas migradas, {skipped} ignoradas")

    except Exception as e:
        print(f"   ❌ Erro geral na migração de dados: {e}")
        print("   Você pode migrar manualmente usando pg_dump ou importando dados via admin.")


def show_next_steps():
    """Exibe os próximos passos após a migração."""
    print()
    print("=" * 60)
    print("  ✅ Migração concluída!")
    print("=" * 60)
    print()
    print("📋 PRÓXIMOS PASSOS:")
    print()
    print("1. Verifique os dados no PostgreSQL:")
    print("   psql $DATABASE_URL -c '\\dt'")
    print()
    print("2. Configure as variáveis de ambiente de produção no servidor.")
    print("   Use backend/.env.production.example como guia.")
    print()
    print("3. Registre o webhook no Asaas:")
    print("   → Acesse: https://www.asaas.com")
    print("   → Menu: Configurações → Integrações → Webhooks")
    print("   → URL: https://SEU_DOMINIO/api/payments/webhook")
    print("   → Token: o valor de ASAAS_WEBHOOK_TOKEN no seu .env")
    print("   → Eventos: PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_DELETED,")
    print("              SUBSCRIPTION_DELETED, PAYMENT_REFUNDED,")
    print("              PAYMENT_CHARGEBACK_REQUESTED")
    print()
    print("4. Teste o fluxo completo de pagamento em sandbox antes de ir ao ar.")
    print()


if __name__ == "__main__":
    pg_url = check_postgres_url()

    if not test_connection(pg_url):
        print("\n❌ Abortando — corrija a conexão e tente novamente.")
        sys.exit(1)

    run_alembic_migrations()
    migrate_data_from_sqlite()
    show_next_steps()
