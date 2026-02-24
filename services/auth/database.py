from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://innovation:secure_pass@postgres:5432/innovation_db"
)

# Engine
engine = create_engine(DATABASE_URL)

# Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base
Base = declarative_base()
