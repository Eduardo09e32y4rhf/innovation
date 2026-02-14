from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from infrastructure.database.sql.base import Base

class Onboarding(Base):
    __tablename__ = "onboardings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    status = Column(String(50), default="pending") # pending, in_progress, completed
    docs_verified = Column(Boolean, default=False)
    step_ti = Column(Boolean, default=False) # Criar email, etc
    step_finance = Column(Boolean, default=False) # Conta salário, etc
    
    document_ocr_data = Column(Text, nullable=True) # JSON com dados extraídos via IA
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
