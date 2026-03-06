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
else:
    # PostgreSQL: timeouts para evitar conexões penduradas
    _connect_args = {"connect_timeout": 5}
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        connect_args=_connect_args,
        pool_pre_ping=True,        # Valida conexão antes de usar
        pool_timeout=10,           # Timeout para obter conexão do pool
        pool_recycle=300,          # Recicla conexões a cada 5 min
        pool_size=5,               # Tamanho do pool
        max_overflow=10,           # Conexões extras além do pool
    )

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)
