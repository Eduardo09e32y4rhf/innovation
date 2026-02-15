from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field


# Schemas de Entrada (Request)
class UserCreate(BaseModel):
    full_name: str = Field(..., max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8)
    company_name: Optional[str] = Field(None, max_length=200)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    company_name: Optional[str] = Field(None, max_length=200)
    brand_logo: Optional[str] = Field(None, max_length=500)
    brand_color_primary: Optional[str] = Field(None, max_length=20)
    brand_color_secondary: Optional[str] = Field(None, max_length=20)


# Schemas de Saída (Response) - PROTEGIDO
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    company_name: Optional[str] = None
    brand_logo: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    badges: Optional[str] = None
    points: Optional[int] = 0
