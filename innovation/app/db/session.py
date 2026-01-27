from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import DATABASE_URL

_connect_args = {}
if str(DATABASE_URL).startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)
