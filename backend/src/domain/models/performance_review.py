from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from infrastructure.database.sql.base import Base

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    period = Column(String(50), nullable=False) # Ex: Q1-2026
    score = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)
    
    competencies_scores = Column(Text, nullable=True) # JSON com scores por competência
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
