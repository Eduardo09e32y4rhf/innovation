from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.finance import Transaction
from domain.models.job import Job
from domain.models.application import Application
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/")
async def get_analytics_data(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Retorna dados agregados para o dashboard de Analytics:
    - Receita total
    - Lucro
    - Jobs ativos
    - Total de candidatos
    - Dados historicos para graficos
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

    today = datetime.now()
    this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Totais Gerais
    total_revenue = get_sum([Transaction.type == "income"])
    total_expenses = get_sum([Transaction.type == "expense"])
    total_profit = total_revenue - total_expenses

    # Dados Historicos (Ultimos 6 meses)
    chart_data = []
    for i in range(5, -1, -1):
        month_date = (this_month_start - timedelta(days=i * 30)).replace(day=1)
        next_month_date = (month_date + timedelta(days=32)).replace(day=1)

        m_income = get_sum([
            Transaction.type == "income",
            Transaction.created_at >= month_date,
            Transaction.created_at < next_month_date
        ])
        m_expense = get_sum([
            Transaction.type == "expense",
            Transaction.created_at >= month_date,
            Transaction.created_at < next_month_date
        ])

        chart_data.append({
            "name": month_date.strftime("%b"),
            "revenue": m_income,
            "expenses": m_expense,
            "profit": m_income - m_expense
        })

    # Contagens
    active_jobs = db.query(Job).filter(
        Job.company_id == current_user.id,
        Job.status == "published"
    ).count()

    total_candidates = db.query(Application).join(Job).filter(
        Job.company_id == current_user.id
    ).count()

    return {
        "summary": {
            "revenue": total_revenue,
            "profit": total_profit,
            "expenses": total_expenses,
            "active_jobs": active_jobs,
            "candidates": total_candidates
        },
        "chart_data": chart_data
    }
