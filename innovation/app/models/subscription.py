from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    plan_id = Column(Integer, ForeignKey("plans.id"))
    status = Column(String, default="inactive")
    mp_subscription_id = Column(String)
    current_period_end = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    plan = relationship("Plan")
