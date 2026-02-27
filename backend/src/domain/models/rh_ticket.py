from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from infrastructure.database.sql.base import Base
from datetime import datetime


class RHTicket(Base):
    __tablename__ = "rh_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    ticket_type = Column(String(50), nullable=False)  # VT, VR, salary, other
    status = Column(String(50), default="open")  # open, analyzing, closed
    description = Column(Text, nullable=False)
    receipt_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
