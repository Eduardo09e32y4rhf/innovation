from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_active_company
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.document import Document
from domain.models.subscription import Subscription
from services.plan_service import get_subscription_plan, has_any_services_feature

router = APIRouter(prefix="/documents", tags=["Documents"])


def _company_has_services(db: Session, company_id: int) -> bool:
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    plan = get_subscription_plan(db, sub)
    return has_any_services_feature(plan)


@router.get("/company")
def list_company_documents(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(get_current_user),
):
    if current_user.role != Role.COMPANY.value:
        raise HTTPException(status_code=403, detail="Acesso restrito à empresa")

    has_services = _company_has_services(db, company_id)
    query = db.query(Document).filter(Document.company_id == company_id)
    if has_services:
        query = query.filter(Document.status == "approved")

    docs = query.order_by(Document.id.desc()).all()
    return [
        {
            "id": doc.id,
            "company_id": doc.company_id,
            "user_id": doc.user_id,
            "name": doc.name,
            "file_path": doc.file_path,
            "doc_type": doc.doc_type,
            "status": doc.status,
            "validation_reason": doc.validation_reason,
            "validated_by_user_id": doc.validated_by_user_id,
            "validated_at": doc.validated_at,
            "created_at": doc.created_at,
        }
        for doc in docs
    ]
