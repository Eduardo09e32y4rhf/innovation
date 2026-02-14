from infrastructure.database.sql.base import Base
from infrastructure.database.sql.session import engine
# Import all models to ensure they are registered with Base
from domain.models.user import User
from domain.models.company import Company
from domain.models.job import Job
from domain.models.application import Application
from domain.models.plan import Plan
from domain.models.subscription import Subscription
from domain.models.audit_log import AuditLog
from domain.models.document import Document
from domain.models.application_status_history import ApplicationStatusHistory

def init_db():
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    print("Database initialized.")

if __name__ == "__main__":
    init_db()
