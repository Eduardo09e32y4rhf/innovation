from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)

    status = Column(String, default="pending")  
    # pending | active | past_due | canceled

    mp_subscription_id = Column(String, unique=True, index=True)
    current_period_end = Column(DateTime, nullable=True)

    user = relationship("User")
    plan = relationship("Plan")
