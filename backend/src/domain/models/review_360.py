from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, JSON
from infrastructure.database.sql.base import Base


class Review360(Base):
    __tablename__ = "reviews_360"

    id = Column(Integer, primary_key=True, index=True)
    subject_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # quem é avaliado
    reviewer_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # quem avalia
    relationship = Column(String(20), nullable=False)  # "peer", "manager", "subordinate"
    score = Column(Float, nullable=False)
    feedback = Column(Text, nullable=True)
    period = Column(String(20), nullable=False)  # ex: "Q1-2026"
    skills = Column(JSON, nullable=True)  # {"communication": 8, "leadership": 7, ...}
