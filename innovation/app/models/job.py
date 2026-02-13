from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    salary = Column(String(100), nullable=True)
    location = Column(String(200), nullable=False)
    type = Column(String(50), nullable=True)  # remoto, presencial, híbrido
    status = Column(String(50), default="active")  # active, inactive, closed
    
    # NOVOS CAMPOS
    interview_link = Column(String(500), nullable=True)  # Link entrevista
    comments = Column(Text, nullable=True)  # Comentários internos
    match_score_threshold = Column(Integer, default=70)  # Score mínimo para match
    
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("User", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
