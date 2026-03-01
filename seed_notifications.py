import sys
import os

# Adiciona o diretório src ao path
sys.path.append(os.path.join(os.getcwd(), "backend", "src"))

from infrastructure.database.sql.session import SessionLocal
from domain.models.notification import Notification
from domain.models.user import User

def seed_notifications():
    db = SessionLocal()
    try:
        # Pega o primeiro usuário (geralmente o admin)
        user = db.query(User).first()
        if not user:
            print("Nenhum usuário encontrado para notificar.")
            return

        print(f"Criando notificações para: {user.name}")
        
        notifications = [
            {
                "title": "Bem-vindo ao Novo Painel!",
                "message": "Agora você tem um sistema de notificações ativo. Fique de olho nos alertas do sistema aqui.",
                "type": "success"
            },
            {
                "title": "Ponto Eletrônico Atualizado",
                "message": "A função de registro manual de ponto já está disponível no seu dashboard.",
                "type": "info"
            },
            {
                "title": "Inteligência Artificial Ativa",
                "message": "Seus insights de RH foram processados com sucesso pelo modelo Gemini Pro.",
                "type": "success"
            }
        ]

        for n in notifications:
            db.add(Notification(
                user_id=user.id,
                title=n["title"],
                message=n["message"],
                type=n["type"]
            ))
        
        db.commit()
        print("Notificações criadas com sucesso!")
    except Exception as e:
        print(f"Erro ao criar notificações: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_notifications()
