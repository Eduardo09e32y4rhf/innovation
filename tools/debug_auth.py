import os
import sys

# Adiciona o diretório 'innovation' ao sys.path para poder importar 'app'
sys.path.append(os.path.join(os.getcwd(), 'innovation'))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.auth_service import authenticate_user
from app.db.database import Base # Verificando qual database.py existe

def debug_login():
    db = SessionLocal()
    email = "admin@innovation.ia"
    password = "admin123"
    
    print(f"Tentando autenticar: {email}")
    try:
        result = authenticate_user(db, email, password)
        print(f"Resultado: {result}")
    except Exception as e:
        import traceback
        print("TRACEBACK:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_login()
