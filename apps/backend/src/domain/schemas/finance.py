"""
Schemas de Finanças com validação robusta — Innovation.ia
──────────────────────────────────────────────────────────
Melhorias:
- Validação de CNPJ e CPF com regex Pydantic
- Enums tipados para evitar valores inválidos na entrada
- Field examples para geração automática da documentação OpenAPI
"""

from __future__ import annotations

import re
from decimal import Decimal
from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

# ── Enums ─────────────────────────────────────────────────────────────────────


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionStatus(str, Enum):
    paid = "paid"
    pending = "pending"
    overdue = "overdue"
    cancelled = "cancelled"


class TaxType(str, Enum):
    DAS = "DAS"
    INSS = "INSS"
    FGTS = "FGTS"
    IRPF = "IRPF"
    ISS = "ISS"
    ICMS = "ICMS"
    other = "other"


# ── Validators ────────────────────────────────────────────────────────────────

_CNPJ_PATTERN = re.compile(r"^\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}$")
_CPF_PATTERN = re.compile(r"^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$")


def validate_cnpj(v: str | None) -> str | None:
    if v is None:
        return v
    cleaned = re.sub(r"\D", "", v)
    if len(cleaned) != 14:
        raise ValueError("CNPJ deve conter 14 dígitos.")
    return cleaned


def validate_cpf(v: str | None) -> str | None:
    if v is None:
        return v
    cleaned = re.sub(r"\D", "", v)
    if len(cleaned) != 11:
        raise ValueError("CPF deve conter 11 dígitos.")
    return cleaned


# ── Schemas ───────────────────────────────────────────────────────────────────


class TransactionCreate(BaseModel):
    description: str = Field(
        ...,
        min_length=2,
        max_length=200,
        examples=["Pagamento de fornecedor ABC"],
    )
    amount: Decimal = Field(
        ...,
        max_digits=12,
        decimal_places=2,
        gt=0,
        examples=[1500.00],
        description="Valor em BRL. Deve ser maior que zero.",
    )
    type: TransactionType = Field(
        ...,
        examples=[TransactionType.expense],
        description="'income' para receitas, 'expense' para despesas.",
    )
    tax_type: Optional[TaxType] = Field(
        default=None,
        examples=[TaxType.DAS],
        description="Tipo de tributo, se aplicável.",
    )
    category: Optional[str] = Field(
        default=None,
        max_length=50,
        examples=["Serviços"],
    )
    due_date: date = Field(
        ...,
        examples=["2026-05-10"],
    )
    status: Optional[TransactionStatus] = Field(
        default=TransactionStatus.pending,
        examples=[TransactionStatus.pending],
    )
    attachment_url: Optional[str] = Field(
        default=None,
        max_length=500,
        examples=["https://storage.example.com/nf-12345.pdf"],
    )
    ai_metadata: Optional[str] = Field(
        default=None,
        description="JSON com dados extraídos via OCR/IA.",
    )

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("O valor da transação deve ser positivo.")
        return v


class TransactionUpdate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=200)
    amount: Optional[Decimal] = Field(
        default=None, max_digits=12, decimal_places=2, gt=0
    )
    status: Optional[TransactionStatus] = None
    category: Optional[str] = Field(default=None, max_length=50)
    payment_date: Optional[date] = None


class BulkStatusUpdate(BaseModel):
    ids: list[int] = Field(..., min_length=1, examples=[[1, 2, 3]])
    status: TransactionStatus


class CnpjLookup(BaseModel):
    cnpj: str = Field(..., examples=["12.345.678/0001-90"])

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj_field(cls, v: str) -> str:
        result = validate_cnpj(v)
        if result is None:
            raise ValueError("CNPJ inválido.")
        return result


class CpfLookup(BaseModel):
    cpf: str = Field(..., examples=["123.456.789-09"])

    @field_validator("cpf")
    @classmethod
    def validate_cpf_field(cls, v: str) -> str:
        result = validate_cpf(v)
        if result is None:
            raise ValueError("CPF inválido.")
        return result
