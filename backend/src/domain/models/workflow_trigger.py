from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from infrastructure.database.sql.base import Base


class WorkflowTrigger(Base):
    __tablename__ = "workflow_triggers"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(255), nullable=False)
    trigger_event = Column(String(100), nullable=False)  # "task_moved_to_done", "ticket_created"
    trigger_condition = Column(JSON, nullable=True)  # {"field": "status", "value": "done"}
    action_type = Column(String(100), nullable=False)  # "send_email", "create_ticket", "notify"
    action_config = Column(JSON, nullable=True)  # {"to": "{{client_email}}", "subject": "..."}
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
