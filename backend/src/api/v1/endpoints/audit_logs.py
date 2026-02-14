from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_internal_role
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.audit_log import AuditLog


router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@router.get("")
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100)
    if current_user.role == Role.COMPANY.value:
        query = query.filter(AuditLog.user_id == current_user.id)
    logs = query.all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.get("/company/{company_id}")
def list_company_audit_logs(
    company_id: int,
    db: Session = Depends(get_db),
    _internal=Depends(require_internal_role),
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.company_id == company_id)
        .order_by(AuditLog.id.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log in logs
    ]
