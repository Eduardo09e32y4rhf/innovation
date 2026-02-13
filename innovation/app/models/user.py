from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(180), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False, default="candidate") # candidate, company
    is_active = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    phone = Column(String(30), nullable=True) # Added back for 2FA
    
    # Perfil (Candidato)
    bio = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    
    # Empresa & White-Label
    company_name = Column(String(200), nullable=True)
    brand_logo = Column(String(500), nullable=True) # URL do logo
    brand_color_primary = Column(String(20), default="#820AD1") # Cor principal
    brand_color_secondary = Column(String(20), default="#0f172a") # Fundo principal
    
    # Gamificação
    badges = Column(Text, nullable=True) # JSON com badges conquistados
    points = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    jobs = relationship("Job", back_populates="company")
    applications = relationship("Application", foreign_keys="Application.candidate_id", back_populates="candidate")
    projects = relationship("Project", back_populates="company")
    tasks = relationship("Task", back_populates="assignee")
    time_entries = relationship("TimeEntry", back_populates="user")

    @property
    def name(self):
        return self.full_name

    @name.setter
    def name(self, value):
        self.full_name = value
