from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from infrastructure.database.sql.base import Base


class KillerQuestion(Base):
    __tablename__ = "killer_questions"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=True)  # Resposta esperada (opcional)
    is_eliminatory = Column(Boolean, default=False)  # Se responder errado, elimina
    order = Column(Integer, default=0)
