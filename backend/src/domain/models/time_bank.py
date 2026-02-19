from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from infrastructure.database.sql.base import Base


class TimeBank(Base):
    __tablename__ = "time_bank"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    type = Column(String(10), nullable=False)  # "credit" | "debit"
    hours = Column(Float, nullable=False)
    reason = Column(Text, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="pending")  # pending | approved | rejected
    created_at = Column(DateTime, server_default=func.now())
