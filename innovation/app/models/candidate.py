from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from app.models.user import User


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # NOVOS CAMPOS MASTERPLAN (Fase 1)
    parsed_resume: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON com dados extraídos
    skills_structured: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON com lista de skills e níveis
    behavioral_profile: Mapped[str | None] = mapped_column(Text, nullable=True)  # Análise DISC/Big5 via IA

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    user: Mapped["User"] = relationship("User")
