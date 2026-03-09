import os
import sys

# Garante que o diretório src está no path para as importações funcionarem
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from infrastructure.database.sql.session import SessionLocal
from domain.models.user import User
from services.asaas_service import asaas_service


def migrate_users_to_asaas():
    print("Iniciando migração de usuários para o Asaas...")
    db = SessionLocal()
    try:
        users = db.query(User).all()
        total_users = len(users)
        migrated = 0

        for idx, user in enumerate(users):
            print(f"[{idx+1}/{total_users}] Migrando usuário: {user.email}")
            customer_id = asaas_service._get_or_create_customer(user, db)
            if customer_id:
                print(f"  -> Sucesso: Customer ID = {customer_id}")
                migrated += 1
            else:
                print(f"  -> Erro ao criar customer para: {user.email}")

        db.commit()
        print(
            f"\nMigração concluída! {migrated}/{total_users} usuários registrados como clientes no Asaas."
        )
    except Exception as e:
        print(f"Erro durante a migração: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    migrate_users_to_asaas()
