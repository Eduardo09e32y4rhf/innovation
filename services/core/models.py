from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(180), unique=True, index=True)
    full_name = Column(String(200))
    role = Column(String(50))
    points = Column(Integer, default=0)

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    company_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(50), default="active") # active, closed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(50), default="pending") # pending, interview, hired, rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    match_score = Column(Numeric(5, 2), default=0.0)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Compatibility
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(String(20), nullable=False) # income, expense
    category = Column(String(50))
    status = Column(String(20), default="paid") # Compatibility
    description = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    company_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="open") # open, in_progress, closed
    priority = Column(String(20), default="medium")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(120), nullable=False)
    entity_type = Column(String(80), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Mission(Base):
    __tablename__ = "missions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=50)
    trigger_action = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)

class UserMission(Base):
    __tablename__ = "user_missions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
