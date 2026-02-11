from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    # Mantém compatibilidade (antigo só tinha email/password/company_name)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)
    phone: str | None = Field(default=None, max_length=30)

    # Nome simples (compat)
    company_name: str | None = Field(default=None, max_length=200)

    # Campos reais da tabela companies (todos opcionais: se não vier, vira placeholder)
    razao_social: str | None = Field(default=None, max_length=200)
    cnpj: str | None = Field(default=None, max_length=20)
    cidade: str | None = Field(default=None, max_length=120)
    uf: str | None = Field(default=None, min_length=2, max_length=2)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str = ""
    token_type: str = "bearer"
    two_factor_required: bool | None = None
    temporary_token: str | None = None  # Token temporário para 2FA



class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    active_company_id: int | None
    terms_accepted_at: datetime | None = None
    terms_version: str | None = None
    created_at: datetime | None = None
