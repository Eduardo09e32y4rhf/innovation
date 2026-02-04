from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    candidate_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(40), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job")
    company = relationship("Company")
    candidate = relationship("User")
