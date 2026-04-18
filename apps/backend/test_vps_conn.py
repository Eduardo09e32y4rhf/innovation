import os
import sys
from pathlib import Path

# Adicionar src ao path
BASE_DIR = Path(__file__).resolve().parent
from dotenv import load_dotenv

sys.path.insert(0, str(BASE_DIR / "src"))

# Carregar .env manualmente para ver o erro real
env_path = BASE_DIR / ".env"
try:
    with open(env_path, "r", encoding="utf-8") as f:
        content = f.read()
    print(f"DEBUG: .env lido com sucesso ({len(content)} bytes)")
except UnicodeDecodeError as e:
    print(f"DEBUG: Erro de encoding no .env: {e}")
    # Tentar com latin-1
    with open(env_path, "r", encoding="latin-1") as f:
        content = f.read()
    print(f"DEBUG: .env lido com latin-1 ({len(content)} bytes)")

load_dotenv(env_path)

from infrastructure.database.sql.session import engine
from sqlalchemy import text


def test_connection():
    # Limpar variaveis PG que podem estar corrompidas no Windows
    for k in list(os.environ.keys()):
        if k.startswith("PG"):
            del os.environ[k]

    db_url = (
        "postgresql://innovation_user:Innov@2026#Secure@23.106.44.75:5432/innovation_db"
    )
    print(f"--- Testando psycopg2 hardcoded: {db_url[:40]}...")
    try:
        import psycopg2

        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        ver = cur.fetchone()
        print(f"OK: Versao do banco: {ver[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR Psycopg2: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_connection()
