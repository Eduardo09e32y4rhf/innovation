from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_event(
    db: Session,
    action: str,
    *,
    user_id: int | None = None,
    company_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: str | None = None,
) -> None:
    entry = AuditLog(
        action=action,
        user_id=user_id,
        company_id=company_id,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(entry)
    db.commit()
