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
from services.audit_service import log_event
from services.bank_hub_service import bank_hub_service

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/summary")
async def get_summary(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.get_cash_flow_summary(db, current_user.id)


@router.get("/prediction")
async def get_prediction(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.ai_cash_flow_prediction(db, current_user.id)


@router.get("/transactions")
async def get_transactions(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    return (
        db.query(Transaction)
        .filter(Transaction.company_id == current_user.id)
        .order_by(Transaction.due_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/transactions")
async def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    try:
        transaction = Transaction(
            description=data.description,
            amount=data.amount,
            type=data.type,
            tax_type=data.tax_type,
            category=data.category,
            due_date=datetime.combine(data.due_date, time.min),
            company_id=current_user.id,
            attachment_url=data.attachment_url,
            ai_metadata=data.ai_metadata,
            status=(
                "paid" if data.type == "income" else "pending"
            ),  # Simplificação do status
        )
        db.add(transaction)
        db.flush()

        # Log event and award XP
        log_event(
            db,
            "TRANSACTION_CREATE",
            user_id=current_user.id,
            company_id=current_user.id,
            entity_type="transaction",
            entity_id=transaction.id,
            details=f"Criou transação: {transaction.description} (R$ {transaction.amount})",
        )

        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Erro ao criar transação: " + str(e)
        )


@router.get("/anomalies")
async def get_anomalies(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.detect_anomalies(db, current_user.id)


@router.get("/taxes")
async def get_taxes(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.get_tax_summary(db, current_user.id)


@router.get("/logs")
async def get_logs(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    return (
        db.query(AuditLog)
        .filter(AuditLog.company_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/bank-hub")
async def get_bank_hub(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return await bank_hub_service.get_consolidated_balance(current_user.id)


@router.get("/burn-rate")
async def get_burn_rate(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company" and current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return await bank_hub_service.get_burn_rate(db, current_user.id)
