from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Numeric,
    ForeignKey,
    Date,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from infrastructure.database.sql.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(200), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(String(20), nullable=False)  # income, expense
    tax_type = Column(String(20), nullable=True)  # DAS, INSS, FGTS, etc.
    status = Column(String(20), default="pending")  # pending, paid, overdue, cancelled

    due_date = Column(DateTime, nullable=False)
    payment_date = Column(DateTime, nullable=True)

    category = Column(String(50), nullable=True)
    cost_center_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    attachment_url = Column(String(500), nullable=True)
    ai_metadata = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    cost_center = relationship("CostCenter", back_populates="transactions")
    company = relationship("User", foreign_keys=[company_id])


class CostCenter(Base):
    __tablename__ = "cost_centers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    transactions = relationship("Transaction", back_populates="cost_center")


class DasMei(Base):
    """Armazena dados do DAS MEI por competência para cada empresa/MEI."""

    __tablename__ = "das_mei"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Identificação
    cnpj = Column(String(20), nullable=True)
    competencia = Column(String(7), nullable=False)  # 'YYYY-MM' ex: '2026-03'

    # Valores (valor padrão MEI 2026 = R$ 75,60 + ICMS/ISS opcionais)
    valor_das = Column(Numeric(10, 2), nullable=False, default=75.60)
    valor_icms = Column(Numeric(10, 2), nullable=True, default=0.0)
    valor_iss = Column(Numeric(10, 2), nullable=True, default=0.0)

    # Pagamento
    vencimento = Column(Date, nullable=False)
    codigo_barras = Column(String(200), nullable=True)
    status = Column(String(20), default="pending")  # pending, paid, overdue
    paid_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    company = relationship("User", foreign_keys=[company_id])
