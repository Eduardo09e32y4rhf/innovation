from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import require_services_role
from core.plans import PlanFeature
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company
from domain.models.document import Document
from domain.models.subscription import Subscription
from services.audit_service import log_event
from services.plan_service import get_subscription_plan, has_plan_feature

router = APIRouter(prefix="/services/documents", tags=["Services Documents"])


def _get_company_subscription(db: Session, company_id: int) -> Subscription | None:
    return (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )


def _ensure_validation_service(db: Session, company_id: int) -> None:
    sub = _get_company_subscription(db, company_id)
    plan = get_subscription_plan(db, sub)
    if not has_plan_feature(plan, PlanFeature.SERVICES_VALIDATION):
        raise HTTPException(status_code=403, detail="Empresa sem serviço de validação")


@router.get("")
def list_documents_for_validation(
    company_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_services_role),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    _ensure_validation_service(db, company_id)

    docs = (
        db.query(Document)
        .filter(Document.company_id == company_id)
        .order_by(Document.id.desc())
        .all()
    )
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


@router.post("/{document_id}/approve")
def approve_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_services_role),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    _ensure_validation_service(db, doc.company_id)

    doc.status = "approved"
    doc.validation_reason = None
    doc.validated_by_user_id = current_user.id
    doc.validated_at = datetime.utcnow()
    db.commit()

    log_event(
        db,
        "document_approved",
        user_id=current_user.id,
        company_id=doc.company_id,
        entity_type="document",
        entity_id=doc.id,
    )
    return {"ok": True, "status": doc.status}


@router.post("/{document_id}/reject")
def reject_document(
    document_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_services_role),
):
    reason = (payload.get("reason") or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="reason é obrigatório")

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    _ensure_validation_service(db, doc.company_id)

    doc.status = "rejected"
    doc.validation_reason = reason
    doc.validated_by_user_id = current_user.id
    doc.validated_at = datetime.utcnow()
    db.commit()

    log_event(
        db,
        "document_rejected",
        user_id=current_user.id,
        company_id=doc.company_id,
        entity_type="document",
        entity_id=doc.id,
        details=reason,
    )
    return {"ok": True, "status": doc.status}
