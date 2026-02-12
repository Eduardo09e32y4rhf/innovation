"""
Inicializa o banco de dados e cria usuário admin padrão
"""
import os
import sys

# Configurar path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'innovation'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import Base, User
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application
from app.core.security import get_password_hash

# Criar engine
DATABASE_URL = "sqlite:///./innovation/innovation.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Criar todas as tabelas
print("🔧 Criando tabelas do banco de dados...")
Base.metadata.create_all(bind=engine)
print("✅ Tabelas criadas!")

# Criar sessão
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Verificar se já existe admin
    existing = db.query(User).filter(User.email == "admin@admin.com").first()
    
    if existing:
        print("\n✅ Usuário admin já existe!")
        print("\n🔐 CREDENCIAIS DE ACESSO:")
        print("=" * 70)
        print("📧 Email:    admin@admin.com")
        print("🔑 Senha:    admin123")
        print("=" * 70)
    else:
        # Primeiro criar o usuário sem company_id
        admin = User(
            email="admin@admin.com",
            full_name="Administrador",
            hashed_password=get_password_hash("admin123"),
            role="company",
            phone="+5511999999999",
            is_active=True,
            terms_accepted=True,
            terms_version="v1"
        )
        db.add(admin)
        db.flush()  # Gera o ID do usuário
        
        # Agora criar a empresa vinculada ao usuário
        company = Company(
            owner_user_id=admin.id,
            razao_social="Empresa Demo LTDA",
            cnpj="12.345.678/0001-90",
            cidade="São Paulo",
            uf="SP",
            status="active"
        )
        db.add(company)
        db.commit()
        
        print("\n" + "=" * 70)
        print("✅ BANCO DE DADOS INICIALIZADO COM SUCESSO!")
        print("=" * 70)
        print("\n🔐 CREDENCIAIS DE ACESSO:")
        print("=" * 70)
        print("📧 Email:    admin@admin.com")
        print("🔑 Senha:    admin123")
        print("=" * 70)
    
    print("\n👉 Acesse: http://localhost:8000/login")
    print("\n")
    
except Exception as e:
    print(f"\n❌ Erro: {str(e)}")
    db.rollback()
finally:
    db.close()
