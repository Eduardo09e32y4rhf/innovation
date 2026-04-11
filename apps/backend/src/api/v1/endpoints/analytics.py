from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
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
    current_user: User = Depends(require_role(Role.COMPANY)),
):
    """
    Get aggregated analytics for the dashboard.
    """
    company_id = current_user.id

    # 1. Financial Summary (Total Revenue, Expenses, Profit)
    # ⚡ Bolt: Fetch all relevant transactions in a single query to eliminate N+1 problem.
    # Why: Previously executed 2 separate database queries for totals, and 12 queries in a loop.
    # Impact: Reduces O(N) database queries to O(1), significantly improving analytics response time.
    totals_query = (
        db.query(Transaction.type, func.sum(Transaction.amount).label("total"))
        .filter(
            Transaction.company_id == company_id,
            Transaction.status == "paid",
        )
        .group_by(Transaction.type)
        .all()
    )

    total_revenue = 0
    total_expenses = 0
    for t_type, total in totals_query:
        if t_type == "income":
            total_revenue = total or 0
        elif t_type == "expense":
            total_expenses = total or 0

    profit = total_revenue - total_expenses

    # 2. Active Jobs
    active_jobs = (
        db.query(Job)
        .filter(Job.company_id == company_id, Job.status.in_(["open", "active"]))
        .count()
    )

    # 3. Total Candidates (Applications received)
    total_candidates = (
        db.query(Application).join(Job).filter(Job.company_id == company_id).count()
    )

    # 4. Financial History (Last 6 months)
    today = datetime.now()
    history_data = []

    # Calculate 6 months ago date
    target_month_start = today.month - 5
    target_year_start = today.year
    while target_month_start <= 0:
        target_month_start += 12
        target_year_start -= 1
    six_months_ago = datetime(target_year_start, target_month_start, 1)

    # Fetch aggregated sums grouped by month/year and type directly from DB
    history_transactions_query = (
        db.query(
            extract("year", Transaction.payment_date).label("year"),
            extract("month", Transaction.payment_date).label("month"),
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.company_id == company_id,
            Transaction.status == "paid",
            Transaction.payment_date >= six_months_ago,
        )
        .group_by(
            extract("year", Transaction.payment_date),
            extract("month", Transaction.payment_date),
            Transaction.type,
        )
        .all()
    )

    # Build a lookup dictionary
    history_lookup = {}
    for year, month, t_type, total in history_transactions_query:
        key = (int(year), int(month))
        if key not in history_lookup:
            history_lookup[key] = {"income": 0, "expense": 0}
        history_lookup[key][t_type] = total or 0

    # We want 6 months including current month
    for i in range(5, -1, -1):
        # Calculate target month/year
        target_month = today.month - i
        target_year = today.year

        while target_month <= 0:
            target_month += 12
            target_year -= 1

        month_start = datetime(target_year, target_month, 1)
        month_label = month_start.strftime("%b")

        key = (target_year, target_month)
        month_income = history_lookup.get(key, {}).get("income", 0)
        month_expense = history_lookup.get(key, {}).get("expense", 0)

        history_data.append(
            {
                "name": month_label,
                "revenue": float(month_income),
                "expenses": float(month_expense),
                "profit": float(month_income - month_expense),
            }
        )

    return {
        "summary": {
            "total_revenue": float(total_revenue),
            "total_expenses": float(total_expenses),
            "profit": float(profit),
            "active_jobs": active_jobs,
            "total_candidates": total_candidates,
        },
        "history": history_data,
    }
