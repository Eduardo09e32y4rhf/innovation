from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from infrastructure.database.sql.base import Base


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

    # CAMPOS ORIGINAIS E EXTENDIDOS
    interview_link = Column(String(500), nullable=True)  # Link entrevista
    comments = Column(Text, nullable=True)  # Comentários internos
    match_score_threshold = Column(Integer, default=70)  # Score mínimo para match

    # NOVOS CAMPOS MASTERPLAN (Fase 1)
    requirements_structured = Column(Text, nullable=True)  # Requisitos extraídos via IA
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    location_type = Column(String(50), default="remote")  # remote, onsite, hybrid
    custom_questions = Column(Text, nullable=True)  # JSON com perguntas dinâmicas

    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("User", back_populates="jobs")
    applications = relationship(
        "Application", back_populates="job", cascade="all, delete-orphan"
    )
