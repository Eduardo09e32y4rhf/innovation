from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(180), unique=True, index=True)
    full_name = Column(String(200))
    role = Column(String(50))

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

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(String(20), nullable=False) # income, expense
    category = Column(String(50))
    description = Column(Text)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="open") # open, in_progress, closed
    priority = Column(String(20), default="medium")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
