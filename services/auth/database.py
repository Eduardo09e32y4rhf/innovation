from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL — usa SQLite local se DATABASE_URL não estiver definida
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./innovation_auth.db")

# SQLite precisa de connect_args especial
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
    # PostgreSQL: adiciona timeouts para evitar conexões penduradas
    connect_args = {"connect_timeout": 5}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,  # Valida conexão antes de usar
        pool_timeout=10,  # Timeout para obter conexão do pool
        pool_recycle=300,  # Recicla conexões a cada 5 min
        pool_size=5,  # Tamanho do pool
        max_overflow=10,  # Conexões extras além do pool
    )

# Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base
Base = declarative_base()
