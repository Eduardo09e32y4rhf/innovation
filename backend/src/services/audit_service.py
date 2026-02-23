from __future__ import annotations
from sqlalchemy.orm import Session
from domain.models.audit_log import AuditLog
from domain.models.user import User

# XP Mapping for different actions
XP_MAP = {
    "chat_message": 10,
    "job_created": 50,
    "job_deleted": -10, # Pena por deletar (opcional)
    "application_created": 20,
    "transaction_created": 15,
    "project_created": 40,
    "task_completed": 30,
    "login": 5,
    "password_reset_request": 5,
    "password_reset_success": 20,
}

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
    # 1. Create Audit Log Entry
    entry = AuditLog(
        action=action,
        user_id=user_id,
        company_id=company_id,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(entry)
    
    # 2. Award Points (XP)
    if user_id:
        xp_to_add = XP_MAP.get(action, 0)
        if xp_to_add > 0:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                if not user.points:
                    user.points = 0
                user.points += xp_to_add
    
    db.commit()
