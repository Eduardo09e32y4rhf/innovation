from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None

class UserOut(UserBase):
    id: int
    active_company_id: Optional[int] = None
    created_at: datetime
    bio: Optional[str] = None
    skills: Optional[str] = None

    class Config:
        orm_mode = True
