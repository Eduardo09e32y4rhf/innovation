from __future__ import annotations
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine

# Adicionar o diretório innovation ao sys.path para que os imports funcionem
PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT / "innovation"))

from app.db.base import Base
# Importar todos os modelos para registrá-los no Base.metadata
from app.models.user import User
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.models.refresh_token import RefreshToken
from app.models.two_factor_code import TwoFactorCode
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.application_status_history import ApplicationStatusHistory

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./innovation.db")
engine = create_engine(DATABASE_URL)

def init_db():
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized at {DATABASE_URL}")

if __name__ == "__main__":
    init_db()
