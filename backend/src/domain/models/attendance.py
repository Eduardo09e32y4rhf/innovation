from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from infrastructure.database.sql.base import Base
from datetime import datetime


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    date = Column(Date, nullable=False, default=func.current_date())
    entry_time = Column(Time, nullable=True)
    exit_time = Column(Time, nullable=True)
    record_type = Column(String(50), default="normal")  # normal, absence, sick_leave

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
