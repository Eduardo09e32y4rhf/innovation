from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    Float,
    Boolean,
    DateTime,
)
from sqlalchemy.sql import func
from infrastructure.database.sql.base import Base


class PDIGoal(Base):
    __tablename__ = "pdi_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    quarter = Column(String(10), nullable=False)  # "Q1-2026"
    progress = Column(Float, default=0.0)  # 0-100%
    completed = Column(Boolean, default=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
