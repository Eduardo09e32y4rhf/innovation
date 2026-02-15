import pytest
from core.security import create_access_token
from domain.models.user import User
from domain.models.finance import Transaction
from decimal import Decimal
from datetime import datetime


# Fixtures for users
@pytest.fixture
def company_user(db_session):
    user = User(
        email="company@test.com",
        hashed_password="hashed_password",
        full_name="Test Company",
        role="company",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def candidate_user(db_session):
    user = User(
        email="candidate@test.com",
        hashed_password="hashed_password",
        full_name="Test Candidate",
        role="candidate",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_create_transaction_success(client, company_user):
    token = create_access_token({"sub": str(company_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/finance/transactions",
        json={
            "description": "Test Transaction",
            "amount": 150.50,
            "type": "income",
            "due_date": "2023-01-01",
        },
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert float(data["amount"]) == 150.50
    assert data["company_id"] == company_user.id


def test_create_transaction_unauthorized(client):
    response = client.post(
        "/api/finance/transactions",
        json={
            "description": "Test Transaction",
            "amount": 150.50,
            "type": "income",
            "due_date": "2023-01-01",
        },
    )
    assert response.status_code == 401


def test_create_transaction_forbidden_candidate(client, candidate_user):
    token = create_access_token({"sub": str(candidate_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/finance/transactions",
        json={
            "description": "Test Transaction",
            "amount": 150.50,
            "type": "income",
            "due_date": "2023-01-01",
        },
        headers=headers,
    )
    assert response.status_code == 403


def test_get_summary_isolation(client, company_user, db_session):
    # 1. Add transaction for company_user
    t1 = Transaction(
        description="Income 1",
        amount=Decimal("1000.00"),
        type="income",
        status="paid",
        due_date=datetime.now(),
        company_id=company_user.id,
    )
    db_session.add(t1)

    # 2. Add transaction for ANOTHER company
    other_user = User(
        email="other@test.com",
        hashed_password="pw",
        full_name="Other Company",
        role="company",
    )
    db_session.add(other_user)
    db_session.commit()  # Ensure IDs generated

    t2 = Transaction(
        description="Other Income",
        amount=Decimal("500.00"),
        type="income",
        status="paid",
        due_date=datetime.now(),
        company_id=other_user.id,
    )
    db_session.add(t2)
    db_session.commit()

    # 3. Request summary as company_user
    token = create_access_token({"sub": str(company_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/finance/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()

    # Should check logic in finance_service.get_cash_flow_summary
    # income = sum(t.amount for t in transactions if t.type == "income" and t.status == "paid")
    # Should be 1000.00
    assert data["total_income"] == 1000.00
    assert data["balance"] == 1000.00
    # Should NOT include 500.00
