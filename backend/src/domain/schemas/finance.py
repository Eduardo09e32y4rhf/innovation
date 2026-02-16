from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import date


class TransactionCreate(BaseModel):
    description: str = Field(..., max_length=200)
    amount: Decimal = Field(..., max_digits=10, decimal_places=2)
    type: str = Field(..., max_length=20)  # income, expense
    tax_type: str | None = Field(
        default=None, max_length=20
    )  # DAS, INSS, FGTS, etc.
    category: str | None = Field(
        default=None, max_length=50
    )  # salary, infrastructure, marketing
    due_date: date
