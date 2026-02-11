from __future__ import annotations
import sys
from pathlib import Path

# Adiciona o diretório 'innovation' ao sys.path para importar os módulos do app
PROJECT_ROOT = Path(__file__).resolve().parent
APP_ROOT = PROJECT_ROOT / "innovation"

if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

try:
    import bcrypt
    from app.db.session import SessionLocal
    from app.models.user import User
    import app.models.company
except ImportError as e:
    print(f"Erro ao importar módulos: {e}")
    sys.exit(1)

def create_admin(email: str, password: str):
    db = SessionLocal()
    try:
        # Hashing manual para evitar bug do passlib com bcrypt novo
        hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        password_hash = hashed_bytes.decode('utf-8')
        
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.password_hash = password_hash
            user.role = "ADM"
            print(f"Usuário {email} encontrado. Senha atualizada e promovido a ADM.")
        else:
            user = User(
                name="Novo Admin",
                email=email,
                password_hash=password_hash,
                role="ADM"
            )
            db.add(user)
            print(f"Usuário {email} criado do zero como ADM.")
        
        db.commit()
    except Exception as e:
        print(f"Erro ao criar usuário: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin("admin@admin.com", "admin123")
