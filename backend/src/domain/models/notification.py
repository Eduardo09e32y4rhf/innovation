from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.sql.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from domain.models.user import User


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    type: Mapped[str] = mapped_column(String(50), default="info") # info, success, warning, error, system
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    
    link: Mapped[str | None] = mapped_column(String(255), nullable=True) # Optional link to a page

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", backref="notifications")
