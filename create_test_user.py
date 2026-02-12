"""
Script para criar usuário admin de teste no Innovation.ia
"""
import sys
import os

# Adicionar o diretório innovation ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'innovation'))

from app.db.database import SessionLocal
from app.models.user import User
from app.models.company import Company
from app.core.security import get_password_hash

def create_test_user():
    db = SessionLocal()
    
    try:
        # Verificar se usuário já existe
        existing_user = db.query(User).filter(User.email == "admin@admin.com").first()
        if existing_user:
            print("✅ Usuário admin@admin.com já existe!")
            print(f"📧 Email: admin@admin.com")
            print(f"🔑 Senha: admin123")
            return
        
        # Criar empresa
        company = Company(
            name="Empresa Teste",
            cnpj="00.000.000/0001-00",
            razao_social="Empresa Teste LTDA",
            cidade="São Paulo",
            uf="SP"
        )
        db.add(company)
        db.flush()
        
        # Criar usuário admin
        user = User(
            email="admin@admin.com",
            full_name="Admin Teste",
            hashed_password=get_password_hash("admin123"),
            role="company",
            company_id=company.id,
            phone="+5511999999999",
            is_active=True,
            terms_accepted=True,
            terms_version="v1"
        )
        
        db.add(user)
        db.commit()
        
        print("=" * 60)
        print("✅ USUÁRIO CRIADO COM SUCESSO!")
        print("=" * 60)
        print(f"📧 Email: admin@admin.com")
        print(f"🔑 Senha: admin123")
        print(f"🏢 Empresa: Empresa Teste")
        print("=" * 60)
        print("\n👉 Use essas credenciais para fazer login em http://localhost:8000/login")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar usuário: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
