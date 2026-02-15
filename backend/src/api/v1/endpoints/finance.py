from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.finance import Transaction
from services.finance_service import finance_service
from domain.models.audit_log import AuditLog
from domain.schemas.finance import TransactionCreate
from typing import List
from decimal import Decimal
from datetime import datetime, time

router = APIRouter(prefix="/api/finance", tags=["finance"])


@router.get("/summary")
async def get_summary(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.get_cash_flow_summary(db, current_user.id)


@router.get("/prediction")
async def get_prediction(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.ai_cash_flow_prediction(db, current_user.id)


@router.post("/transactions")
async def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    try:
        transaction = Transaction(
            description=data.description,
            amount=data.amount,
            type=data.type,
            due_date=datetime.combine(data.due_date, time.min),
            company_id=current_user.id,
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        # Log the error in a real app
        raise HTTPException(status_code=500, detail="Erro ao criar transação: " + str(e))


@router.get("/anomalies")
async def get_anomalies(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.detect_anomalies(db, current_user.id)


@router.get("/logs")
async def get_logs(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    return (
        db.query(AuditLog)
        .filter(AuditLog.company_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
        .all()
    )
