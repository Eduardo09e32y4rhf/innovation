from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="pending")
    
    # NOVOS CAMPOS
    match_score = Column(Float, nullable=True)  # Score de matching IA
    ai_analysis = Column(Text, nullable=True)  # Análise da IA
    recruiter_notes = Column(Text, nullable=True)  # Notas do recrutador
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="applications")
