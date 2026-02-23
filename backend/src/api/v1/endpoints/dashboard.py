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
from domain.models.project import Project
from domain.models.audit_log import AuditLog

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
    # Contagens Reais
    active_jobs = db.query(Job).filter(Job.company_id == current_user.id, Job.status == "published").count()
    total_applications = db.query(Application).join(Job).filter(Job.company_id == current_user.id).count()
    total_projects = db.query(Project).filter(Project.company_id == current_user.id).count()
    
    # Gamificação
    user_points = current_user.points or 0
    user_level = (user_points // 1000) + 1  # Lógica simples: Cada 1000 XP ganha um nível
    xp_in_level = user_points % 1000
    next_level_xp = 1000

    # Score IA (calculado com base em feedbacks ou matchings concluídos)
    ai_score = db.query(func.avg(Application.match_score)).join(Job).filter(Job.company_id == current_user.id).scalar()
    ai_score = round(float(ai_score * 100), 1) if ai_score else 0.0

    return {
        "user": {
            "points": user_points,
            "level": user_level,
            "xp_in_level": xp_in_level,
            "next_level_xp": next_level_xp
        },
        "revenue": {
            "current": current_revenue,
            "previous": 0.0,
            "change_percent": 0.0,
            "chart_data": [], # Gráficos podem ser populados dinamicamente se houver histórico
        },
        "projects": total_projects,
        "candidates": total_applications,
        "active_jobs": active_jobs,
        "support_rate": 0, # Mocked por enquanto até ter tickets reais
        "ai_score": ai_score,
        "profit": {
            "current": current_profit,
            "previous": 0.0,
            "change_percent": 0.0,
            "margin_percent": (
                (current_profit / current_revenue * 100) if current_revenue > 0 else 0
            ),
        }
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
    db_activities = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).limit(limit).all()

    activities = []
    for act in db_activities:
        activities.append({
            "id": act.id,
            "type": act.entity_type or "system",
            "message": f"{act.action}: {act.details or ''}",
            "timestamp": act.created_at,
            "avatar": None
        })

    return {"activities": activities}
