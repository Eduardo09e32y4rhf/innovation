from __future__ import annotations
from sqlalchemy.orm import Session
from domain.models.audit_log import AuditLog
from domain.models.user import User

# XP Mapping for different actions
XP_MAP = {
    "CHAT_MESSAGE": 10,
    "JOB_CREATE": 50,
    "APPLICATION_CREATE": 20,
    "TRANSACTION_CREATE": 15,
    "PROJECT_CREATE": 40,
    "TASK_COMPLETE": 30,
    "LOGIN": 5,
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
