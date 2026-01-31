from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    hashed_password = Column(String)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=True)
