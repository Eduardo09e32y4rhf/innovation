from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

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

class TransactionBase(BaseModel):
    amount: float
    type: str
    category: Optional[str] = None
    description: Optional[str] = None

class TransactionOut(TransactionBase):
    id: int
    date: datetime
    class Config:
        from_attributes = True

class TicketBase(BaseModel):
    subject: str
    description: str
    priority: Optional[str] = "medium"

class TicketOut(TicketBase):
    id: int
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

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
