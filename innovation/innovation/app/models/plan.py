from sqlalchemy import Column, Integer, String, JSON
from app.db.base import Base

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    price = Column(Integer)
    features = Column(JSON)
    # ex: ["pdf", "history", "ia"]
