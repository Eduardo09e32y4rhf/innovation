from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.finance import Transaction
from domain.models.job import Job
from domain.models.application import Application

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/metrics")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Retorna métricas principais do dashboard:
    - Receita mensal
    - Custo operacional
    - Lucro líquido
    - Dados para gráficos
    """

    # Helper para somar transações
    def get_sum(filters):
        query = db.query(func.sum(Transaction.amount)).filter(
            Transaction.company_id == current_user.id,
            Transaction.status == "paid",
            *filters,
        )
        result = query.scalar()
        return float(result) if result else 0.0

    current_revenue = get_sum([Transaction.type == "income"])
    current_costs = get_sum([Transaction.type == "expense"])
    current_profit = current_revenue - current_costs

    # Breakdown de custos
    salary_costs = get_sum(
        [Transaction.type == "expense", Transaction.category == "salary"]
    )
    infra_costs = get_sum(
        [Transaction.type == "expense", Transaction.category == "infrastructure"]
    )
    marketing_costs = get_sum(
        [Transaction.type == "expense", Transaction.category == "marketing"]
    )
    other_costs = current_costs - (salary_costs + infra_costs + marketing_costs)

    # Contagens
    # active_jobs = db.query(Job).filter(Job.company_id == current_user.id, Job.status == "published").count()
    # total_applications = db.query(Application).join(Job).filter(Job.company_id == current_user.id).count()

    # Manter dados históricos mockados para evitar gráfico quebrado no frontend
    return {
        "revenue": {
            "current": current_revenue,
            "previous": 23150.00,  # Mocked
            "change_percent": 8.9,  # Mocked
            "chart_data": [
                {"month": "Jan", "value": 18500},
                {"month": "Fev", "value": 19200},
                {"month": "Mar", "value": 21000},
                {"month": "Abr", "value": 22500},
                {"month": "Mai", "value": 23150},
                {"month": "Jun", "value": current_revenue},
            ],
        },
        "costs": {
            "current": current_costs,
            "previous": 5890.00,  # Mocked
            "change_percent": 8.1,  # Mocked
            "breakdown": {
                "salaries": salary_costs,
                "infrastructure": infra_costs,
                "marketing": marketing_costs,
                "others": other_costs,
            },
            "chart_data": [
                {"month": "Jan", "value": 5200},
                {"month": "Fev", "value": 5400},
                {"month": "Mar", "value": 5600},
                {"month": "Abr", "value": 5750},
                {"month": "Mai", "value": 5890},
                {"month": "Jun", "value": current_costs},
            ],
        },
        "profit": {
            "current": current_profit,
            "previous": 17260.00,  # Mocked
            "change_percent": 12.1,  # Mocked
            "margin_percent": (
                (current_profit / current_revenue * 100) if current_revenue > 0 else 0
            ),
            "chart_data": [
                {"month": "Jan", "value": 13300},
                {"month": "Fev", "value": 13800},
                {"month": "Mar", "value": 15400},
                {"month": "Abr", "value": 16750},
                {"month": "Mai", "value": 17260},
                {"month": "Jun", "value": current_profit},
            ],
        },
    }


@router.get("/calendar")
async def get_calendar_tasks(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna tarefas e eventos do calendário
    """
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year

    # Dados mockados de tarefas
    tasks = [
        {
            "id": 1,
            "title": "Reunião com candidato",
            "date": f"{year}-{month:02d}-11",
            "type": "interview",
            "status": "scheduled",
        },
        {
            "id": 2,
            "title": "Publicar vaga Senior Python",
            "date": f"{year}-{month:02d}-15",
            "type": "task",
            "status": "pending",
        },
        {
            "id": 3,
            "title": "Candidato para senior completo",
            "date": f"{year}-{month:02d}-18",
            "type": "task",
            "status": "completed",
        },
        {
            "id": 4,
            "title": "Delegado no esta semana",
            "date": f"{year}-{month:02d}-22",
            "type": "task",
            "status": "pending",
        },
    ]

    return {"month": month, "year": year, "tasks": tasks}


@router.get("/kanban")
async def get_kanban_board(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Retorna processos seletivos organizados em kanban
    Colunas: A Fazer | Em Progresso | Em Revisão | Concluído
    """

    kanban_data = {
        "columns": [
            {
                "id": "todo",
                "title": "A Fazer",
                "color": "#6B7280",
                "cards": [
                    {
                        "id": "job_1",
                        "title": "Candidato para Senior Python Developer",
                        "job_title": "Senior Python Developer",
                        "candidates_count": 5,
                        "priority": "high",
                        "avatars": ["JD", "MS"],
                    }
                ],
            },
            {
                "id": "in_progress",
                "title": "Em Progresso",
                "color": "#3B82F6",
                "cards": [
                    {
                        "id": "job_2",
                        "title": "Candidato para Senior Python Developer",
                        "job_title": "Senior Python Developer",
                        "candidates_count": 3,
                        "priority": "medium",
                        "status": "Entrevista Hoje",
                        "avatars": ["AB", "CD"],
                    },
                    {
                        "id": "job_3",
                        "title": "Designer",
                        "job_title": "UI/UX Designer",
                        "candidates_count": 2,
                        "priority": "low",
                        "status": "Análise de Portfólio",
                        "avatars": ["EF"],
                    },
                ],
            },
            {
                "id": "review",
                "title": "Em Revisão",
                "color": "#F59E0B",
                "cards": [
                    {
                        "id": "job_4",
                        "title": "Candidato para Devto Revisto",
                        "job_title": "Full Stack Developer",
                        "candidates_count": 1,
                        "priority": "high",
                        "status": "Aguardando Aprovação",
                        "avatars": ["GH", "IJ"],
                    }
                ],
            },
            {
                "id": "done",
                "title": "Concluído",
                "color": "#10B981",
                "cards": [
                    {
                        "id": "job_5",
                        "title": "Candidato para Senior Sector Developer",
                        "job_title": "Senior Backend Developer",
                        "candidates_count": 1,
                        "priority": "completed",
                        "status": "Contratado",
                        "completed_date": "2023-06-10",
                        "avatars": ["KL", "MN"],
                    }
                ],
            },
        ]
    }

    return kanban_data


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna atividades recentes do sistema
    """
    activities = [
        {
            "id": 1,
            "type": "application",
            "message": "Nova candidatura para Senior Python Developer",
            "candidate_name": "João Silva",
            "timestamp": datetime.now() - timedelta(minutes=5),
            "avatar": "JS",
        },
        {
            "id": 2,
            "type": "interview",
            "message": "Entrevista agendada com Maria Santos",
            "candidate_name": "Maria Santos",
            "timestamp": datetime.now() - timedelta(hours=2),
            "avatar": "MS",
        },
        {
            "id": 3,
            "type": "job",
            "message": "Nova vaga publicada: UX Designer",
            "timestamp": datetime.now() - timedelta(hours=5),
            "avatar": None,
        },
    ]

    return {"activities": activities[:limit]}
