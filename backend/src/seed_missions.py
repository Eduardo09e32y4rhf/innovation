from infrastructure.database.sql.session import SessionLocal
from domain.models.gamification import Mission

def seed_missions():
    db = SessionLocal()
    try:
        missions = [
            {
                "title": "Enviar 1ª mensagem ao Chat IA",
                "description": "Inicie uma conversa com nossa inteligência artificial.",
                "xp_reward": 50,
                "trigger_action": "CHAT_MESSAGE"
            },
            {
                "title": "Criar uma vaga no ATS",
                "description": "Publique sua primeira oportunidade de emprego.",
                "xp_reward": 100,
                "trigger_action": "JOB_CREATE"
            },
            {
                "title": "Revisar Financeiro do mês",
                "description": "Cadastre uma transação ou visualize o fluxo de caixa.",
                "xp_reward": 75,
                "trigger_action": "TRANSACTION_CREATE"
            },
            {
                "title": "Abrir ticket de suporte",
                "description": "Entre em contato com nosso time de suporte.",
                "xp_reward": 50,
                "trigger_action": "TICKET_CREATE"
            },
            {
                "title": "Explorar módulo de Projetos",
                "description": "Crie um novo projeto no gerenciador.",
                "xp_reward": 80,
                "trigger_action": "PROJECT_CREATE"
            }
        ]

        for m_data in missions:
            # Check if mission already exists by title
            exists = db.query(Mission).filter(Mission.title == m_data["title"]).first()
            if not exists:
                mission = Mission(**m_data)
                db.add(mission)
        
        db.commit()
        print("Missões diárias populadas com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"Erro ao popular missões: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_missions()
