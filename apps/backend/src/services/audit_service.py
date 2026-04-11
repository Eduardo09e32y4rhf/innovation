from __future__ import annotations
from sqlalchemy.orm import Session
from domain.models.audit_log import AuditLog
from domain.models.user import User

# XP Mapping for different actions
XP_MAP = {
    "CHAT_MESSAGE": 15,
    "JOB_CREATE": 100,
    "APPLICATION_CREATE": 30,
    "APPLICATION_STATUS_UPDATED": 25,
    "TRANSACTION_CREATE": 20,
    "PROJECT_CREATE": 80,
    "TASK_COMPLETE": 50,
    "LOGIN": 10,
    "TICKET_CREATE": 25,
    "JOB_UPDATE": 15,
    "JOB_DELETE": 5,
    "AI_ANALYSIS_REQUEST": 40,
    "FINANCE_REPORT_GENERATE": 35,
}

from domain.models.gamification import Mission, UserMission
from datetime import datetime, timezone, time


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

    # 2. Award Base Points (XP)
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            xp_to_add = XP_MAP.get(action, 0)

            # 3. Check for Missions (Fase 4.2)
            # Find an active mission triggered by this action
            mission = (
                db.query(Mission)
                .filter(Mission.trigger_action == action, Mission.is_active == True)
                .first()
            )

            if mission:
                # Check if user already completed this mission TODAY (Daily Mission logic)
                today_start = datetime.combine(
                    datetime.now(timezone.utc).date(), time.min
                )
                already_done = (
                    db.query(UserMission)
                    .filter(
                        UserMission.user_id == user_id,
                        UserMission.mission_id == mission.id,
                        UserMission.completed_at >= today_start,
                    )
                    .first()
                )

                if not already_done:
                    # Mark as completed and add bonus XP
                    db.add(UserMission(user_id=user_id, mission_id=mission.id))
                    xp_to_add += mission.xp_reward
                    print(
                        f"MISSION COMPLETED: {mission.title} (+{mission.xp_reward} XP extra)"
                    )

            if xp_to_add > 0:
                if not user.points:
                    user.points = 0
                user.points += xp_to_add

    db.commit()
