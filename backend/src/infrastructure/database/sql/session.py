from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.config import DATABASE_URL

# Fix for Render (postgres:// -> postgresql://)
if str(DATABASE_URL).startswith("postgres://"):
    DATABASE_URL = str(DATABASE_URL).replace("postgres://", "postgresql://", 1)

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
