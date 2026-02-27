from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from datetime import datetime

from infrastructure.database.sql.dependencies import get_db
from core.dependencies import require_role
from core.roles import Role
from domain.models.user import User
from domain.models.job import Job
from domain.models.finance import Transaction
from domain.models.application import Application

router = APIRouter(tags=["analytics"])

@router.get("", response_model=Dict[str, Any])
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.COMPANY))
):
    """
    Get aggregated analytics for the dashboard.
    """
    company_id = current_user.id

    # 1. Financial Summary (Total Revenue, Expenses, Profit)
    income_query = db.query(func.sum(Transaction.amount)).filter(
        Transaction.company_id == company_id,
        Transaction.type == "income",
        Transaction.status == "paid"
    )
    total_revenue = income_query.scalar() or 0

    expense_query = db.query(func.sum(Transaction.amount)).filter(
        Transaction.company_id == company_id,
        Transaction.type == "expense",
        Transaction.status == "paid"
    )
    total_expenses = expense_query.scalar() or 0

    profit = total_revenue - total_expenses

    # 2. Active Jobs
    active_jobs = db.query(Job).filter(
        Job.company_id == company_id,
        Job.status.in_(["open", "active"])
    ).count()

    # 3. Total Candidates (Applications received)
    total_candidates = db.query(Application).join(Job).filter(
        Job.company_id == company_id
    ).count()

    # 4. Financial History (Last 6 months)
    today = datetime.now()
    history_data = []

    # We want 6 months including current month
    for i in range(5, -1, -1):
        # Calculate target month/year
        target_month = today.month - i
        target_year = today.year

        while target_month <= 0:
            target_month += 12
            target_year -= 1

        month_start = datetime(target_year, target_month, 1)

        # Calculate next month for range end
        next_month = target_month + 1
        next_year = target_year
        if next_month > 12:
            next_month = 1
            next_year += 1

        month_end = datetime(next_year, next_month, 1)

        month_label = month_start.strftime("%b")

        month_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.company_id == company_id,
            Transaction.type == "income",
            Transaction.status == "paid",
            Transaction.payment_date >= month_start,
            Transaction.payment_date < month_end
        ).scalar() or 0

        month_expense = db.query(func.sum(Transaction.amount)).filter(
            Transaction.company_id == company_id,
            Transaction.type == "expense",
            Transaction.status == "paid",
            Transaction.payment_date >= month_start,
            Transaction.payment_date < month_end
        ).scalar() or 0

        history_data.append({
            "name": month_label,
            "revenue": float(month_income),
            "expenses": float(month_expense),
            "profit": float(month_income - month_expense)
        })

    return {
        "summary": {
            "total_revenue": float(total_revenue),
            "total_expenses": float(total_expenses),
            "profit": float(profit),
            "active_jobs": active_jobs,
            "total_candidates": total_candidates
        },
        "history": history_data
    }
