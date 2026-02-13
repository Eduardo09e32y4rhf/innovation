from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.dependencies import get_db
from ..services.finance_service import finance_service
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/finance", tags=["finance"])

class TransactionCreate(BaseModel):
    description: str
    amount: float
    type: str # income, expense
    due_date: str

@router.get("/summary")
async def get_summary(db: Session = Depends(get_db)):
    # Mock company_id = 1
    return finance_service.get_cash_flow_summary(db, 1)

@router.get("/prediction")
async def get_prediction(db: Session = Depends(get_db)):
    return finance_service.ai_cash_flow_prediction(db, 1)

@router.post("/transactions")
async def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    from ..models.finance import Transaction
    from datetime import datetime
    
    transaction = Transaction(
        description=data.description,
        amount=data.amount,
        type=data.type,
        due_date=datetime.strptime(data.due_date, "%Y-%m-%d"),
        company_id=1
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.get("/anomalies")
async def get_anomalies(db: Session = Depends(get_db)):
    return finance_service.detect_anomalies(db, 1)

@router.get("/logs")
async def get_logs(db: Session = Depends(get_db)):
    from ..models.audit_log import AuditLog
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(20).all()
