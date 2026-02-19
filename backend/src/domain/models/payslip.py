from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.sql import func
from infrastructure.database.sql.base import Base


class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    reference_month = Column(String(7), nullable=False)  # "2026-02"
    gross_salary = Column(Float, nullable=False)
    net_salary = Column(Float, nullable=False)
    deductions = Column(Float, default=0.0)
    file_url = Column(String(500), nullable=True)  # S3 / local path
    uploaded_at = Column(DateTime, server_default=func.now())
