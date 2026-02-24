from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from infrastructure.database.sql.base import Base


class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=50)
    trigger_action = Column(
        String(100), nullable=False
    )  # LOGIN, TRANSACTION_CREATE, etc.
    is_active = Column(Boolean, default=True)


class UserMission(Base):
    __tablename__ = "user_missions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Check if it's a daily mission (can be completed once per day)
    # For now, we'll assume most missions in the plan are daily tasks.
