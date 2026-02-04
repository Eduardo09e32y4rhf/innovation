from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String(2000), nullable=False)
    location = Column(String(200), nullable=True)
    status = Column(String(40), default="open")
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company")
