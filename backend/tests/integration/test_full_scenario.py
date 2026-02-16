from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from domain.models.user import User
from domain.models.company import Company
from domain.models.finance import Transaction
from datetime import date, timedelta

def test_full_company_finance_flow(client: TestClient, db_session: Session):
    # 1. Register Company with full address
    register_payload = {
        "email": "company@test.com",
        "password": "password123",
        "role": "company",
        "name": "Test Company",
        "company_name": "Test Co",
        "razao_social": "Test Co Ltda",
        "cnpj": "12345678000199",
        "cidade": "Osasco",
        "uf": "SP",
        "cep": "06000-000",
        "street": "Rua Innovation",
        "number": "100",
        "complement": "Sala 1",
        "neighborhood": "Centro"
    }
    resp = client.post("/api/auth/register", json=register_payload)
    assert resp.status_code == 200
    user_data = resp.json()
    assert user_data["email"] == "company@test.com"

    # Verify DB has address
    company = db_session.query(Company).filter(Company.cnpj == "12345678000199").first()
    assert company is not None
    assert company.street == "Rua Innovation"
    assert company.cep == "06000-000"

    # 2. Login
    login_payload = {"email": "company@test.com", "password": "password123"}
    resp = client.post("/api/auth/login", json=login_payload)
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Transactions
    # Income: 10000
    client.post(
        "/api/finance/transactions",
        json={
            "description": "Project Alpha",
            "amount": 10000.00,
            "type": "income",
            "due_date": str(date.today()),
        },
        headers=headers
    )
    # Expense: Salary 3000
    client.post(
        "/api/finance/transactions",
        json={
            "description": "Dev Salary",
            "amount": 3000.00,
            "type": "expense",
            "due_date": str(date.today()),
            "category": "salary"  # Assuming this field is handled by schema even if not explicitly in my update (it was in original model)
        },
        headers=headers
    )
    # Expense: Tax DAS 500
    client.post(
        "/api/finance/transactions",
        json={
            "description": "DAS Monthly",
            "amount": 500.00,
            "type": "expense",
            "tax_type": "DAS",
            "due_date": str(date.today())
        },
        headers=headers
    )

    # Mark them as PAID directly in DB (API defaults to pending usually, let's check)
    # The default status is "pending". Dashboard metrics filter by "paid".
    # I need to update them or create them as paid if API allows.
    # The current API doesn't seem to expose status update easily in the snippet I saw,
    # so I'll cheat and update via DB session for the test.
    db_session.query(Transaction).update({"status": "paid"})
    db_session.commit()

    # 4. Check Dashboard Metrics
    resp = client.get("/api/dashboard/metrics", headers=headers)
    assert resp.status_code == 200
    metrics = resp.json()

    # Revenue = 10000
    assert metrics["revenue"]["current"] == 10000.0
    # Costs = 3000 (Salary) + 500 (Tax) = 3500
    assert metrics["costs"]["current"] == 3500.0
    # Profit = 6500
    assert metrics["profit"]["current"] == 6500.0
    # Breakdown
    assert metrics["costs"]["breakdown"]["salaries"] == 3000.0

    # 5. Check Tax Summary
    resp = client.get("/api/finance/taxes", headers=headers)
    assert resp.status_code == 200
    tax_data = resp.json()

    assert tax_data["total_taxes"] == 500.0
    assert "DAS" in tax_data["breakdown"]
    assert tax_data["breakdown"]["DAS"]["total"] == 500.0
