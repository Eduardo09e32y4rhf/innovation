from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
)

class Base(DeclarativeBase):
    pass

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
