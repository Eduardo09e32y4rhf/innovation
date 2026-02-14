from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from infrastructure.database.sql.base import Base

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(200), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(String(20), nullable=False) # income, expense
    status = Column(String(20), default="pending") # pending, paid, cancelled
    
    due_date = Column(DateTime, nullable=False)
    payment_date = Column(DateTime, nullable=True)
    
    category = Column(String(50), nullable=True)
    cost_center_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    cost_center = relationship("CostCenter", back_populates="transactions")
    company = relationship("User", foreign_keys=[company_id])

class CostCenter(Base):
    __tablename__ = "cost_centers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    transactions = relationship("Transaction", back_populates="cost_center")
