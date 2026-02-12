"""
Script simples para criar usuário admin
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'innovation'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import Base, User
from app.core.security import get_password_hash

# Criar engine
DATABASE_URL = "sqlite:///./innovation/innovation.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Criar tabelas
Base.metadata.create_all(bind=engine)

# Criar sessão
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Verificar se já existe
    existing = db.query(User).filter(User.email == "admin@admin.com").first()
    
    if existing:
        print("\n✅ Usuário já existe!")
    else:
        # Criar usuário simples
        admin = User(
            email="admin@admin.com",
            full_name="Administrador",
            hashed_password=get_password_hash("admin123"),
            role="company",
            is_active=True,
            company_name="Empresa Demo"
        )
        db.add(admin)
        db.commit()
        print("\n✅ Usuário criado com sucesso!")
    
    print("\n" + "=" * 70)
    print("🔐 CREDENCIAIS DE LOGIN")
    print("=" * 70)
    print("📧 Email:    admin@admin.com")
    print("🔑 Senha:    admin123")
    print("=" * 70)
    print("\n👉 Acesse: http://localhost:8000/login\n")
    
except Exception as e:
    print(f"\n❌ Erro: {str(e)}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
