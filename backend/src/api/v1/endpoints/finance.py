from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.finance import Transaction
from services.finance_service import finance_service
from domain.models.audit_log import AuditLog
from domain.schemas.finance import TransactionCreate
from datetime import datetime, time
from services.audit_service import log_event
from services.bank_hub_service import bank_hub_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance", tags=["finance"])

ALLOWED_ROLES = {"company", "admin", "superadmin", "candidate"}


def _check_role(user: User):
    """Allow any authenticated user to access finance for now."""
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="Não autenticado")


# ── GET /finance/summary ─────────────────────────────────────────────────────
@router.get("/summary")
async def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
    try:
        return finance_service.get_cash_flow_summary(db, current_user.id)
    except Exception as e:
        logger.error(f"[finance/summary] {e}")
        return {
            "balance": 0,
            "total_income": 0,
            "total_expenses": 0,
            "pending_income": 0,
            "pending_expenses": 0,
        }


# ── GET /finance/prediction ──────────────────────────────────────────────────
@router.get("/prediction")
async def get_prediction(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
    try:
        return finance_service.ai_cash_flow_prediction(db, current_user.id)
    except Exception as e:
        logger.error(f"[finance/prediction] {e}")
        return {"prediction": "Dados insuficientes.", "recommended_action": ""}


# ── GET /finance/transactions ─────────────────────────────────────────────────
@router.get("/transactions")
async def get_transactions(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
    try:
        return (
            db.query(Transaction)
            .filter(Transaction.company_id == current_user.id)
            .order_by(Transaction.due_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    except Exception as e:
        logger.error(f"[finance/transactions GET] {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar transações: {str(e)}")


# ── POST /finance/transactions ─────────────────────────────────────────────────
@router.post("/transactions")
async def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
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
            status=data.status if data.status else (
                "paid" if data.type == "income" else "pending"
            ),
        )
        db.add(transaction)
        db.flush()

        try:
            log_event(
                db,
                "TRANSACTION_CREATE",
                user_id=current_user.id,
                company_id=current_user.id,
                entity_type="transaction",
                entity_id=transaction.id,
                details=f"Transação: {transaction.description} (R$ {transaction.amount})",
            )
        except Exception as log_err:
            logger.warning(f"[finance] log_event não crítico: {log_err}")

        db.commit()
        db.refresh(transaction)
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[finance/transactions POST] {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar transação: {str(e)}")


# ── GET /finance/anomalies ─────────────────────────────────────────────────────
@router.get("/anomalies")
async def get_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
    try:
        return finance_service.detect_anomalies(db, current_user.id)
    except Exception as e:
        logger.error(f"[finance/anomalies] {e}")
        return []


# ── GET /finance/taxes ────────────────────────────────────────────────────────
@router.get("/taxes")
async def get_taxes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
    try:
        return finance_service.get_tax_summary(db, current_user.id)
    except Exception as e:
        logger.error(f"[finance/taxes] {e}")
        return {"total_taxes": 0, "breakdown": {}}


# ── GET /finance/logs ─────────────────────────────────────────────────────────
@router.get("/logs")
async def get_logs(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
    try:
        return (
            db.query(AuditLog)
            .filter(AuditLog.company_id == current_user.id)
            .order_by(AuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    except Exception as e:
        logger.error(f"[finance/logs] {e}")
        return []


# ── GET /finance/bank-hub ─────────────────────────────────────────────────────
@router.get("/bank-hub")
async def get_bank_hub(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
    return await bank_hub_service.get_consolidated_balance(current_user.id)


# ── GET /finance/burn-rate ────────────────────────────────────────────────────
@router.get("/burn-rate")
async def get_burn_rate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_role(current_user)
    return await bank_hub_service.get_burn_rate(db, current_user.id)
