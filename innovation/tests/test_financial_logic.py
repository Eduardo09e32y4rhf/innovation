from app.services.finance_service import FinanceService
from app.models.finance import Transaction
from app.models.user import User
from decimal import Decimal
import pytest
from datetime import datetime

def test_decimal_precision_db(db_session):
    user = User(full_name="Test", email="test@test.com", hashed_password="pw", role="company")
    db_session.add(user)
    db_session.commit()

    # 0.1 + 0.2
    t1 = Transaction(
        description="T1", amount=Decimal("0.10"), type="income", status="paid",
        due_date=datetime.now(), company_id=user.id
    )
    t2 = Transaction(
        description="T2", amount=Decimal("0.20"), type="income", status="paid",
        due_date=datetime.now(), company_id=user.id
    )
    db_session.add(t1)
    db_session.add(t2)
    db_session.commit()

    summary = FinanceService.get_cash_flow_summary(db_session, user.id)

    # Check that sum is exactly 0.30 (Decimal)
    assert summary["total_income"] == Decimal("0.30")
    assert isinstance(summary["total_income"], Decimal)

    # If it was float, it would likely fail equality with Decimal('0.30') or have precision issues
    # assert summary["total_income"] != 0.30000000000000004
