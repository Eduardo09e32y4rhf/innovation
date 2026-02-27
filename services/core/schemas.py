from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ── JOBS ─────────────────────────────────────────────────────────────────────

class JobBase(BaseModel):
    title: str
    description: str
    status: Optional[str] = "active"


class JobCreate(JobBase):
    pass


class JobOut(JobBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── APPLICATIONS ─────────────────────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    job_id: int
    candidate_id: Optional[int] = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    status: str
    match_score: Optional[float] = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


# ── TRANSACTIONS ──────────────────────────────────────────────────────────────

class TransactionBase(BaseModel):
    amount: float
    type: str
    category: Optional[str] = None
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    due_date: Optional[str] = None
    attachment_url: Optional[str] = None
    ai_metadata: Optional[str] = None


class TransactionOut(TransactionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── PROJECTS ──────────────────────────────────────────────────────────────────

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectOut(ProjectBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── TASKS ─────────────────────────────────────────────────────────────────────

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    project_id: Optional[int] = None
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    pass


class TaskOut(TaskBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── TICKETS ───────────────────────────────────────────────────────────────────

class TicketBase(BaseModel):
    subject: str
    description: str
    priority: Optional[str] = "medium"


class TicketCreate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: str
    priority: Optional[str] = "medium"


class TicketOut(TicketBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── LEAVE REQUESTS ────────────────────────────────────────────────────────────

class LeaveRequestCreate(BaseModel):
    start_date: str
    end_date: str
    reason: Optional[str] = None


class LeaveRequestOut(BaseModel):
    id: int
    user_id: int
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── PULSE SURVEY ──────────────────────────────────────────────────────────────

class PulseSurveyCreate(BaseModel):
    score: int
    comment: Optional[str] = None


# ── SYSTEM ANNOUNCEMENTS ──────────────────────────────────────────────────────

class SystemAnnouncementBase(BaseModel):
    message: str
    type: Optional[str] = "info"
    is_active: Optional[bool] = True
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class SystemAnnouncementCreate(SystemAnnouncementBase):
    pass


class SystemAnnouncementOut(SystemAnnouncementBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
