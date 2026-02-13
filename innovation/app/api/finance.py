from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.dependencies import get_db
from ..core.dependencies import get_current_user
from ..models.user import User
from ..models.finance import Transaction
from ..services.finance_service import finance_service
from ..models.audit_log import AuditLog
from pydantic import BaseModel, Field
from typing import List
from decimal import Decimal
from datetime import datetime

router = APIRouter(prefix="/api/finance", tags=["finance"])

class TransactionCreate(BaseModel):
    description: str = Field(..., max_length=200)
    amount: Decimal = Field(..., max_digits=10, decimal_places=2)
    type: str = Field(..., max_length=20) # income, expense
    due_date: str

@router.get("/summary")
async def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.get_cash_flow_summary(db, current_user.id)

@router.get("/prediction")
async def get_prediction(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.ai_cash_flow_prediction(db, current_user.id)

@router.post("/transactions")
async def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    
    try:
        due_date_obj = datetime.strptime(data.due_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data inválida. Use YYYY-MM-DD")

    transaction = Transaction(
        description=data.description,
        amount=data.amount,
        type=data.type,
        due_date=due_date_obj,
        company_id=current_user.id
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.get("/anomalies")
async def get_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.detect_anomalies(db, current_user.id)

@router.get("/logs")
async def get_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    return db.query(AuditLog).filter(AuditLog.company_id == current_user.id).order_by(AuditLog.created_at.desc()).limit(20).all()
