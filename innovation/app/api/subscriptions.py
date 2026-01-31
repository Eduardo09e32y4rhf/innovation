from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.services.audit_service import log_event


router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/me")
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada")
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
    current_user=Depends(get_current_user),
):
    plan_id = payload.get("plan_id")
    company_id = payload.get("company_id")
    if not plan_id or not company_id:
        raise HTTPException(status_code=400, detail="plan_id e company_id são obrigatórios")

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

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
