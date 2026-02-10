from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
import random

from sqlalchemy import DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from app.models.job import Job
    from app.models.company import Company
    from app.models.user import User


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    job_id: Mapped[int] = mapped_column(Integer, ForeignKey("jobs.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id"), nullable=False)
    candidate_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="received")
    
    # New Field for AI Score
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=datetime.utcnow,
        nullable=False,
    )

    job: Mapped["Job"] = relationship("Job")
    company: Mapped["Company"] = relationship("Company")
    candidate: Mapped["User"] = relationship("User")
