from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from infrastructure.database.sql.base import Base

class PulseSurvey(Base):
    __tablename__ = "pulse_surveys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood_score = Column(Integer, nullable=False) # 1-5 ou 1-10
    comment = Column(Text, nullable=True)
    anonymous = Column(Boolean, default=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
