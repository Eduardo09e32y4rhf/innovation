from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class JobBase(BaseModel):
    title: str
    description: str
    location: str | None = None
    status: str = "open"


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    status: str | None = None


class JobOut(JobBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime | None = None  # Added back updated_at just in case

    model_config = ConfigDict(from_attributes=True)
