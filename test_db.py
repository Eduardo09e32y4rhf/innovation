from __future__ import annotations
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
APP_ROOT = PROJECT_ROOT / "innovation"

if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

try:
    from app.db.session import SessionLocal
    from sqlalchemy import text
except ImportError as e:
    print(f"Erro ao importar: {e}")
    sys.exit(1)

def test_conn():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        print("Conexão com DB OK!")
    except Exception as e:
        print(f"Erro de conexão: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_conn()
