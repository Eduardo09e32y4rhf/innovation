from .session import engine, SessionLocal
from .base import Base


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
