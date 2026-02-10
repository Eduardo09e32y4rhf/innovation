from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class JobBase(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    status: Optional[str] = "open"

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None

class JobResponse(JobBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
