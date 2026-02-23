from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, text
from datetime import datetime, timezone
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(180), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False, default="candidate")
    is_active = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    phone = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False)

class TwoFactorCode(Base):
    __tablename__ = "two_factor_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    code = Column(String(10))
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
