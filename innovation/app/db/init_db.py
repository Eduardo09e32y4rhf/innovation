from app.db.base import Base
from app.db.session import engine
# Import all models to ensure they are registered with Base
from app.models.user import User
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.application_status_history import ApplicationStatusHistory

def init_db():
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    print("Database initialized.")

if __name__ == "__main__":
    init_db()
