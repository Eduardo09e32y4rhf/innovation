from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL — usa SQLite local se DATABASE_URL não estiver definida
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./innovation_auth.db"
)

# SQLite precisa de connect_args especial
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Engine
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base
Base = declarative_base()
