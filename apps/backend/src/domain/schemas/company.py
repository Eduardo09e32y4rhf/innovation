from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CompanyBase(BaseModel):
    razao_social: str = Field(..., max_length=200)
    cnpj: str = Field(..., max_length=20)
    cidade: str = Field(..., max_length=120)
    uf: str = Field(..., max_length=2)
    cep: Optional[str] = Field(None, max_length=20)
    street: Optional[str] = Field(None, max_length=200)
    number: Optional[str] = Field(None, max_length=20)
    complement: Optional[str] = Field(None, max_length=100)
    neighborhood: Optional[str] = Field(None, max_length=100)
    logo_url: Optional[str] = Field(None, max_length=500)
    plan_id: Optional[int] = None
    status: Optional[str] = Field("active", max_length=20)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    razao_social: Optional[str] = Field(None, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=20)
    cidade: Optional[str] = Field(None, max_length=120)
    uf: Optional[str] = Field(None, max_length=2)
    cep: Optional[str] = Field(None, max_length=20)
    street: Optional[str] = Field(None, max_length=200)
    number: Optional[str] = Field(None, max_length=20)
    complement: Optional[str] = Field(None, max_length=100)
    neighborhood: Optional[str] = Field(None, max_length=100)
    logo_url: Optional[str] = Field(None, max_length=500)
    plan_id: Optional[int] = None
    status: Optional[str] = Field(None, max_length=20)


class CompanyResponse(CompanyBase):
    id: int
    owner_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
