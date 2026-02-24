from datetime import datetime, timedelta, timezone
from decimal import Decimal
import random

from infrastructure.database.sql.session import SessionLocal
from domain.models.user import User
from domain.models.finance import Transaction
from domain.models.job import Job
from domain.models.application import Application
from domain.models.project import Project
from domain.models.audit_log import AuditLog


def seed_dashboard_data():
    db = SessionLocal()
    try:
        # Pega o primeiro usuário 'company' para popular
        user = db.query(User).filter(User.role == "company").first()
        if not user:
            print(
                "Nenhum usuário 'company' encontrado. Por favor, registre um primeiro."
            )
            return

        print(f"Populando dados para o usuário: {user.email} (ID: {user.id})")

        # 1. Limpa dados antigos (opcional, mas bom para demo)
        # db.query(Transaction).filter(Transaction.company_id == user.id).delete()
        # db.query(Job).filter(Job.company_id == user.id).delete()

        # 2. Criar Transações (Financeiro)
        # Últimos 6 meses
        now = datetime.now()
        for i in range(6):
            month_date = (now - timedelta(days=i * 30)).replace(
                day=random.randint(1, 28)
            )

            # Receitas
            for _ in range(random.randint(2, 5)):
                db.add(
                    Transaction(
                        description=f"Venda de Serviço #{random.randint(100, 999)}",
                        amount=Decimal(random.randint(5000, 15000)),
                        type="income",
                        status="paid",
                        due_date=month_date,
                        created_at=month_date,
                        company_id=user.id,
                    )
                )

            # Despesas
            for cat in ["infrastructure", "marketing", "salary"]:
                db.add(
                    Transaction(
                        description=f"Pagamento {cat.capitalize()}",
                        amount=Decimal(random.randint(2000, 6000)),
                        type="expense",
                        status="paid",
                        category=cat,
                        due_date=month_date,
                        created_at=month_date,
                        company_id=user.id,
                    )
                )

        # 3. Criar Vagas (ATS)
        titles = [
            "Senior Python Developer",
            "UI/UX Designer",
            "Product Manager",
            "DevOps Engineer",
        ]
        jobs = []
        for title in titles:
            job = Job(
                title=title,
                description="Hiring skilled professionals...",
                location="Remote / São Paulo",
                status="published",
                company_id=user.id,
                created_at=now - timedelta(days=random.randint(1, 10)),
            )
            db.add(job)
            jobs.append(job)

        db.flush()  # Para pegar IDs das vagas

        # 4. Criar Candidatos e Match Scores
        for job in jobs:
            for _ in range(random.randint(3, 8)):
                db.add(
                    Application(
                        job_id=job.id,
                        candidate_id=user.id,  # Simplificado para o seed
                        match_score=random.uniform(0.6, 0.98),
                        status="applied",
                        created_at=now - timedelta(days=random.randint(0, 5)),
                    )
                )

        # 5. Criar Projetos
        prj_names = [
            "Integração IA Cloud",
            "Portal de Talentos v2",
            "Dashboard Executivo",
        ]
        for name in prj_names:
            db.add(
                Project(
                    name=name,
                    description="Project in development...",
                    company_id=user.id,
                    created_at=now - timedelta(days=random.randint(5, 20)),
                )
            )

        # 6. Atualizar XP do usuário
        user.points = random.randint(1500, 4500)

        db.commit()
        print("Dados do Dashboard populados com sucesso!")

    except Exception as e:
        db.rollback()
        print(f"Erro ao popular dados: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_dashboard_data()
