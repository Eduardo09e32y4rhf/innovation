from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: Optional[str] = None
    two_factor_required: bool = False
    temporary_token: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    role: str = "candidate"
    phone: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True
