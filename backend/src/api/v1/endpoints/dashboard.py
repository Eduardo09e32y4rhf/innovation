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

    # Lógica de datas para histórico
    today = datetime.now()
    this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    current_revenue = get_sum(
        [Transaction.type == "income", Transaction.created_at >= this_month_start]
    )
    previous_revenue = get_sum(
        [
            Transaction.type == "income",
            Transaction.created_at >= last_month_start,
            Transaction.created_at < this_month_start,
        ]
    )

    current_costs = get_sum(
        [Transaction.type == "expense", Transaction.created_at >= this_month_start]
    )
    previous_costs = get_sum(
        [
            Transaction.type == "expense",
            Transaction.created_at >= last_month_start,
            Transaction.created_at < this_month_start,
        ]
    )

    # Calculate payroll costs (salaries)
    payroll_costs = get_sum(
        [
            Transaction.type == "expense",
            Transaction.created_at >= this_month_start,
            Transaction.category == "Salário"  # Or "salary" depending on frontend/backend convention
        ]
    )

    current_profit = current_revenue - current_costs
    previous_profit = previous_revenue - previous_costs

    # Dados para o gráfico de evolução (últimos 6 meses)
    chart_data = []
    for i in range(5, -1, -1):
        month_date = (this_month_start - timedelta(days=i * 30)).replace(day=1)
        next_month_date = (month_date + timedelta(days=32)).replace(day=1)

        m_income = get_sum(
            [
                Transaction.type == "income",
                Transaction.created_at >= month_date,
                Transaction.created_at < next_month_date,
            ]
        )
        m_expense = get_sum(
            [
                Transaction.type == "expense",
                Transaction.created_at >= month_date,
                Transaction.created_at < next_month_date,
            ]
        )

        chart_data.append(
            {
                "month": month_date.strftime("%b"),
                "revenue": m_income,
                "profit": m_income - m_expense,
                "value": m_income,  # Usado pelo frontend simples
            }
        )

    # Contagens Reais
    active_jobs = (
        db.query(Job)
        .filter(Job.company_id == current_user.id, Job.status == "published")
        .count()
    )
    total_applications = (
        db.query(Application)
        .join(Job)
        .filter(Job.company_id == current_user.id)
        .count()
    )
    total_projects = (
        db.query(Project).filter(Project.company_id == current_user.id).count()
    )

    # Gamificação
    user_points = current_user.points or 0
    user_level = (user_points // 1000) + 1
    xp_in_level = user_points % 1000
    next_level_xp = 1000

    # Score IA
    ai_score_val = (
        db.query(func.avg(Application.match_score))
        .join(Job)
        .filter(Job.company_id == current_user.id)
        .scalar()
    )
    ai_score = round(float(ai_score_val * 100), 1) if ai_score_val else 0.0

    # Cálculo de porcentagem de mudança
    def calc_change(curr, prev):
        if prev == 0:
            return 100 if curr > 0 else 0
        return round(((curr - prev) / prev) * 100, 1)

    return {
        "user": {
            "points": user_points,
            "level": user_level,
            "xp_in_level": xp_in_level,
            "next_level_xp": next_level_xp,
        },
        "revenue": {
            "current": current_revenue,
            "previous": previous_revenue,
            "change_percent": calc_change(current_revenue, previous_revenue),
            "chart_data": chart_data,
        },
        "costs": {
            "breakdown": {
                "salaries": payroll_costs
            }
        },
        "projects": total_projects,
        "candidates": total_applications,
        "active_jobs": active_jobs,
        "support_rate": 0,
        "ai_score": ai_score,
        "profit": {
            "current": current_profit,
            "previous": previous_profit,
            "change_percent": calc_change(current_profit, previous_profit),
            "margin_percent": (
                (current_profit / current_revenue * 100) if current_revenue > 0 else 0
            ),
            "chart_data": [
                {"month": d["month"], "value": d["profit"]} for d in chart_data
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
    db_activities = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    activities = []
    for act in db_activities:
        activities.append(
            {
                "id": act.id,
                "type": act.entity_type or "system",
                "message": f"{act.action}: {act.details or ''}",
                "timestamp": act.created_at,
                "avatar": None,
            }
        )

    return {"activities": activities}


@router.get("/heatmap")
async def get_activity_heatmap(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Retorna contagem de ações por dia nas últimas 12 semanas para o heatmap.
    """
    twelve_weeks_ago = datetime.now() - timedelta(weeks=12)

    # Agrupa logs por data
    activity_counts = (
        db.query(
            func.date(AuditLog.created_at).label("date"),
            func.count(AuditLog.id).label("count"),
        )
        .filter(
            AuditLog.user_id == current_user.id, AuditLog.created_at >= twelve_weeks_ago
        )
        .group_by(func.date(AuditLog.created_at))
        .all()
    )

    heatmap_data = {str(row.date): row.count for row in activity_counts}

    return heatmap_data


from domain.models.gamification import Mission, UserMission


@router.get("/missions")
async def get_missions(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Retorna missões diárias e progresso do usuário logado"""
    from datetime import time, timezone

    # Active missions
    all_missions = db.query(Mission).filter(Mission.is_active == True).all()

    # Done today
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min)
    done_ids = [
        um.mission_id
        for um in db.query(UserMission)
        .filter(UserMission.user_id == current_user.id)
        .filter(UserMission.completed_at >= today_start)
        .all()
    ]

    result = []
    for m in all_missions:
        result.append(
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "xp_reward": m.xp_reward,
                "done": m.id in done_ids,
            }
        )

    return result
