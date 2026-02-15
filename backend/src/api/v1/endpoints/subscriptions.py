from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_role
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company
from domain.models.subscription import Subscription
from domain.models.plan import Plan
from services.audit_service import log_event

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/me")
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada")
    company = db.query(Company).filter(Company.id == sub.company_id).first()
    if not company or company.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Empresa inválida")
    return {
        "id": sub.id,
        "company_id": sub.company_id,
        "plan_id": sub.plan_id,
        "status": sub.status,
        "mp_preapproval_id": sub.mp_preapproval_id,
    }


@router.post("")
def create_subscription(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    plan_id = payload.get("plan_id")
    company_id = payload.get("company_id")
    if not plan_id:
        raise HTTPException(status_code=400, detail="plan_id é obrigatório")

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    if company_id:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        if company.owner_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Empresa inválida")
    else:
        company = (
            db.query(Company).filter(Company.owner_user_id == current_user.id).first()
        )
        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        company_id = company.id

    sub = Subscription(
        user_id=current_user.id,
        company_id=company_id,
        plan_id=plan_id,
        status="pending",
        mp_preapproval_id=payload.get("mp_preapproval_id"),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    log_event(
        db,
        "subscription_created",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="subscription",
        entity_id=sub.id,
    )
    return {
        "id": sub.id,
        "company_id": sub.company_id,
        "plan_id": sub.plan_id,
        "status": sub.status,
        "mp_preapproval_id": sub.mp_preapproval_id,
    }
