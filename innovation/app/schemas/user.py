from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

# Schemas de Entrada (Request)
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None

# Schemas de Saída (Response) - PROTEGIDO
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str  # Role é apenas saída, nunca entrada
    active_company_id: Optional[int] = None
    created_at: datetime
    bio: Optional[str] = None
    skills: Optional[str] = None
    phone: Optional[str] = None
