from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ApplicationBase(BaseModel):
    job_id: int


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: str


class ApplicationOut(ApplicationBase):
    id: int
    company_id: int
    candidate_user_id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
