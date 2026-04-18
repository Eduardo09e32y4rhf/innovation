import os
import sys

# Adiciona o diretório src ao path para os imports funcionarem
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from sqlalchemy.orm import Session
from infrastructure.database.sql.session import SessionLocal, engine
from domain.models.user import User
from core.security import get_password_hash
from domain.models.company import Company

def seed_root():
    db = SessionLocal()
    email = "eduardo998468@gmail.com"
    password = "a" # O usuário pediu para conseguir logar, vou colocar a senha que ele enviou no prompt anterior se ele tiver, mas aqui coloco o que ele desejar.
    
    print(f"🚀 Iniciando seed para: {email}")
    
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print("⚠️ Usuário já existe. Resetando senha...")
            user.hashed_password = get_password_hash(password)
        else:
            print("✨ Criando novo usuário...")
            user = User(
                full_name="Eduardo Innovation",
                email=email,
                hashed_password=get_password_hash(password),
                role="admin",
                is_active=True
            )
            db.add(user)
        
        db.commit()
        db.refresh(user)
        print(f"✅ Sucesso! Usuário ID: {user.id}")
        
    except Exception as e:
        print(f"❌ Erro no seed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_root()
