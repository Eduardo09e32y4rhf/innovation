import pytest
from datetime import date


def test_finance_tax_breakdown_extended(client, db_session):
    # Register and Login
    register_payload = {
        "email": "finance_test@test.com",
        "password": "password123",
        "role": "company",
        "name": "Finance Test",
        "company_name": "Finance Co",
        "razao_social": "Finance Co Ltda",
        "cnpj": "99999999000199",
        "cidade": "Osasco",
        "uf": "SP",
    }
    resp = client.post("/api/auth/register", json=register_payload)
    assert resp.status_code == 200

    login_payload = {"email": "finance_test@test.com", "password": "password123"}
    resp = client.post("/api/auth/login", json=login_payload)
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Taxes: DAS, INSS, FGTS
    taxes = [("DAS", 100.00), ("INSS", 200.00), ("FGTS", 300.00)]

    for tax_type, amount in taxes:
        resp = client.post(
            "/api/finance/transactions",
            json={
                "description": f"Tax {tax_type}",
                "amount": amount,
                "type": "expense",
                "tax_type": tax_type,
                "due_date": str(date.today()),
                "category": "tax",
            },
            headers=headers,
        )
        assert resp.status_code == 200, f"Failed to create tax {tax_type}: {resp.text}"

    # Verify Summary
    resp = client.get("/api/finance/taxes", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # Check totals
    # Note: Logic in finance_service might sum all expenses with tax_type.
    assert data["total_taxes"] == 600.00

    # Check breakdown keys and values
    assert "DAS" in data["breakdown"]
    assert data["breakdown"]["DAS"]["total"] == 100.00

    assert "INSS" in data["breakdown"]
    assert data["breakdown"]["INSS"]["total"] == 200.00

    assert "FGTS" in data["breakdown"]
    assert data["breakdown"]["FGTS"]["total"] == 300.00
