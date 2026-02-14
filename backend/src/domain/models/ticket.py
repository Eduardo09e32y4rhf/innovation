from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from infrastructure.database.sql.base import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="open")  # open, in_progress, resolved, closed
    priority = Column(String(50), default="medium")  # low, medium, high, critical

    category_id = Column(Integer, ForeignKey("ticket_categories.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # SLA Tracking
    sla_deadline = Column(DateTime, nullable=True)
    sla_status = Column(String(20), default="on_time")  # on_time, warning, breached

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = relationship("TicketCategory", back_populates="tickets")
    requester = relationship("User", foreign_keys=[requester_id])
    assignee = relationship("User", foreign_keys=[assignee_id])


class TicketCategory(Base):
    __tablename__ = "ticket_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # Ex: TI, Financeiro, RH
    department = Column(String(100), nullable=False)
    expected_sla_hours = Column(Integer, default=24)

    tickets = relationship("Ticket", back_populates="category")
