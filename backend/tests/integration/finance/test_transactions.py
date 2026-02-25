from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from domain.models.finance import Transaction

def test_create_transaction_with_receipt(client: TestClient, db_session: Session):
    # 1. Register Company
    client.post("/api/auth/register", json={
        "email": "receipt@test.com",
        "password": "password123",
        "role": "company",
        "name": "Test Company",
        "company_name": "Test Co",
        "cnpj": "99999999000199"
    })

    # 2. Login
    # Note: verify logic might vary, usually assumes strict auth
    resp = client.post("/api/auth/login", json={"email": "receipt@test.com", "password": "password123"})
    if resp.status_code != 200:
       # Try form data if json fails (depends on implementation)
       resp = client.post("/api/auth/login", data={"username": "receipt@test.com", "password": "password123"})

    assert resp.status_code == 200
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Transaction with Attachment
    payload = {
        "description": "Gasolina",
        "amount": 150.00,
        "type": "expense",
        "due_date": "2024-01-01",
        "attachment_url": "http://example.com/receipt.jpg",
        "ai_metadata": '{"merchant": "Posto Shell", "date": "2024-01-01"}'
    }
    resp = client.post("/api/finance/transactions", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["attachment_url"] == "http://example.com/receipt.jpg"
    assert data["ai_metadata"] == '{"merchant": "Posto Shell", "date": "2024-01-01"}'

    # 4. Verify in DB
    tx = db_session.query(Transaction).filter(Transaction.id == data["id"]).first()
    assert tx.attachment_url == "http://example.com/receipt.jpg"
