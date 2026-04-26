from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import func, or_
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

    # Lógica de datas para histórico
    today = datetime.now()
    this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    # ⚡ Bolt: Fetch all relevant transactions in a single query to eliminate N+1 problem.
    # Why: Previously executed 16 separate database queries using get_sum() inside a loop.
    # Impact: Reduces O(N) database queries to O(1), significantly improving dashboard response time.
    six_months_ago = (this_month_start - timedelta(days=5 * 30)).replace(day=1)

    # Receita / custo: considera lançamentos operacionais (não só "paid").
    # Muitos registros ficam "pending"/"overdue" até conciliação; excluímos apenas cancelados.
    transactions = (
        db.query(Transaction.type, Transaction.amount, Transaction.created_at)
        .filter(
            Transaction.company_id == current_user.id,
            or_(
                Transaction.status.is_(None),
                Transaction.status != "cancelled",
            ),
            Transaction.created_at >= six_months_ago,
        )
        .all()
    )

    current_revenue = 0.0
    previous_revenue = 0.0
    current_costs = 0.0
    previous_costs = 0.0

    for t in transactions:
        if t.created_at >= this_month_start:
            if t.type == "income":
                current_revenue += float(t.amount)
            elif t.type == "expense":
                current_costs += float(t.amount)
        elif t.created_at >= last_month_start and t.created_at < this_month_start:
            if t.type == "income":
                previous_revenue += float(t.amount)
            elif t.type == "expense":
                previous_costs += float(t.amount)

    current_profit = current_revenue - current_costs
    previous_profit = previous_revenue - previous_costs

    # Dados para o gráfico de evolução (últimos 6 meses)
    chart_data = []
    for i in range(5, -1, -1):
        month_date = (this_month_start - timedelta(days=i * 30)).replace(day=1)
        next_month_date = (month_date + timedelta(days=32)).replace(day=1)

        m_income = 0.0
        m_expense = 0.0

        for t in transactions:
            if t.created_at >= month_date and t.created_at < next_month_date:
                if t.type == "income":
                    m_income += float(t.amount)
                elif t.type == "expense":
                    m_expense += float(t.amount)

        chart_data.append(
            {
                "month": month_date.strftime("%b"),
                "revenue": m_income,
                "profit": m_income - m_expense,
                "value": m_income,  # Usado pelo frontend simples
            }
        )

    # Contagens Reais
    # Vagas "ativas": modelo padrão usa `active`; legado/APIs podem usar `published`.
    active_jobs = (
        db.query(Job)
        .filter(
            Job.company_id == current_user.id,
            Job.status.in_(("active", "published")),
        )
        .count()
    )
    total_applications = (
        db.query(Application)
        .join(Job)
        .filter(Job.company_id == current_user.id)
        .count()
    )
    total_projects = (
        db.query(Project)
        .filter(
            Project.company_id == current_user.id,
            or_(
                Project.status.is_(None),
                ~Project.status.in_(("completed", "archived", "cancelled")),
            ),
        )
        .count()
    )

    # Gamificação
    user_points = current_user.points or 0
    user_level = current_user.level or 1
    xp_in_level = current_user.current_xp or 0
    next_level_xp = user_level * 1000

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
        "most_frequented": [
            {"module": row[0] or "Geral", "count": row[1]}
            for row in db.query(AuditLog.entity_type, func.count(AuditLog.id))
            .filter(AuditLog.user_id == current_user.id)
            .group_by(AuditLog.entity_type)
            .order_by(func.count(AuditLog.id).desc())
            .limit(4)
            .all()
        ],
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

    # Map statuses to kanban columns
    status_map = {
        "received": "todo",
        "in_review": "in_progress",
        "approved": "review",
        "hired": "done",
    }

    # Initialize columns
    columns = {
        "todo": {"id": "todo", "title": "A Fazer", "color": "#6B7280", "cards": []},
        "in_progress": {
            "id": "in_progress",
            "title": "Em Progresso",
            "color": "#3B82F6",
            "cards": [],
        },
        "review": {
            "id": "review",
            "title": "Em Revisão",
            "color": "#F59E0B",
            "cards": [],
        },
        "done": {"id": "done", "title": "Concluído", "color": "#10B981", "cards": []},
    }

    # Fetch real applications
    # ⚡ Bolt: Eliminate N+1 query problem by fetching related candidate and job eagerly
    # Why: Previously executed multiple separate database queries for app.candidate and app.job inside the loop
    # Impact: Reduces O(N) database queries to O(1), significantly improving kanban board loading time
    apps = (
        db.query(Application)
        .join(Job)
        .options(contains_eager(Application.job), joinedload(Application.candidate))
        .filter(Job.company_id == current_user.id)
        .order_by(Application.created_at.desc())
        .limit(50)
        .all()
    )

    for app in apps:
        col_id = status_map.get(app.status, "todo")
        columns[col_id]["cards"].append(
            {
                "id": f"app_{app.id}",
                "title": f"Candidato: {getattr(app.candidate, 'full_name', 'Anônimo')}",
                "job_title": app.job.title if app.job else "Vaga Desconhecida",
                "match_score": app.match_score or 0,
                "priority": "high" if (app.match_score or 0) > 0.8 else "medium",
                "status": app.status.replace("_", " ").title(),
                "avatars": [getattr(app.candidate, "full_name", "U")[:2].upper()],
            }
        )

    return {"columns": list(columns.values())}


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
