from pydantic import BaseModel, Field, ConfigDict
from decimal import Decimal
from datetime import date, datetime
from typing import List, Dict, Any


class TransactionCreate(BaseModel):
    description: str = Field(..., max_length=200)
    amount: Decimal = Field(..., max_digits=10, decimal_places=2)
    type: str = Field(..., max_length=20)  # income, expense
    tax_type: str | None = Field(default=None, max_length=20)  # DAS, INSS, FGTS, etc.
    category: str | None = Field(
        default=None, max_length=50
    )  # salary, infrastructure, marketing
    due_date: date


class TransactionRead(TransactionCreate):
    id: int
    created_at: datetime
    status: str | None = None
    payment_date: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class FinanceSummary(BaseModel):
    balance: Decimal
    total_income: Decimal
    total_expenses: Decimal
    pending_income: Decimal
    pending_expenses: Decimal


class TaxItem(BaseModel):
    description: str
    amount: Decimal
    due_date: datetime
    status: str | None


class TaxCategory(BaseModel):
    total: Decimal
    pending: Decimal
    paid: Decimal
    items: List[TaxItem]


class TaxSummary(BaseModel):
    total_taxes: Decimal
    breakdown: Dict[str, TaxCategory]
