from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None  # Suporte para o campo 'name' do frontend
    full_name: Optional[str] = None  # Fallback
    role: Optional[str] = "candidate"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str  # Adicionado para compatibilidade com Dashboard
    full_name: str
    role: str
    is_active: bool
    is_superuser: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    is_new_user: bool


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
