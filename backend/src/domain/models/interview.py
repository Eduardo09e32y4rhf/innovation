from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from infrastructure.database.sql.base import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(String(50), default="scheduled")  # scheduled, completed, cancelled
    type = Column(
        String(50), nullable=True
    )  # technical, cultural_fit, portfolio_review
    location = Column(String(100), nullable=True)  # Online - Zoom, Presencial
    notes = Column(Text, nullable=True)

    scheduled_date = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    feedback = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    recommendation = Column(String(50), nullable=True)  # Hire, Reject, Hold

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    application = relationship("Application", backref="interviews")
    candidate = relationship(
        "User", foreign_keys=[candidate_id], backref="candidate_interviews"
    )
    interviewer = relationship(
        "User", foreign_keys=[interviewer_id], backref="interviewer_interviews"
    )
