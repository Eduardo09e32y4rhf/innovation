from fastapi.testclient import TestClient
from app.main import app
from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.core.security import create_access_token
from unittest.mock import MagicMock, patch
import pytest

client = TestClient(app)


def test_path_traversal_css():
    # Attempt to access a file outside css directory via traversal
    # We use URL encoding to prevent TestClient from normalizing the path
    # Must be authenticated to reach the handler
    token = create_access_token({"sub": "1"})
    client.cookies.set("access_token", token)

    response = client.get("/css/..%2fREADME.md")
    # 404 is expected if Router blocks slash in path param. 403 if our logic catches it.
    assert response.status_code in [403, 404]


def test_path_traversal_pages():
    token = create_access_token({"sub": "1"})
    client.cookies.set("access_token", token)

    response = client.get("/pages/..%2fREADME.md")
    assert response.status_code in [403, 404]


def test_finance_role_case_insensitivity():
    # User with role "Company" (mixed case) should be allowed
    user = MagicMock()
    user.role = "Company"
    user.id = 1

    # Mock DB
    mock_db = MagicMock()

    # Mock Service to avoid actual DB calls inside service
    with patch(
        "app.services.finance_service.finance_service.get_cash_flow_summary"
    ) as mock_service:
        mock_service.return_value = {"income": 100, "expense": 50, "balance": 50}

        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: mock_db

        try:
            response = client.get("/api/finance/summary")
            assert response.status_code == 200
            assert response.json() == {"income": 100, "expense": 50, "balance": 50}
        finally:
            app.dependency_overrides = {}


def test_finance_role_unauthorized():
    # User with role "Candidate" should be 403
    user = MagicMock()
    user.role = "Candidate"

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get("/api/finance/summary")
        assert response.status_code == 403
    finally:
        app.dependency_overrides = {}


def test_create_transaction_date_parsing():
    # Test that YYYY-MM-DD is accepted
    user = MagicMock()
    user.role = "company"
    user.id = 1

    mock_db = MagicMock()

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: mock_db

    payload = {
        "description": "Test Transaction",
        "amount": 100.50,
        "type": "income",
        "due_date": "2023-12-25",
    }

    try:
        response = client.post("/api/finance/transactions", json=payload)
        # If successful, it returns the transaction object (or fails at DB add if mock not perfect)
        # We just want to ensure validation passes (i.e. not 422)
        # The code does db.add(transaction), db.commit(), db.refresh().
        # We need to mock these on mock_db.

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Test Transaction"
        # Check due_date is returned (as datetime usually iso format)
        assert "2023-12-25" in data["due_date"]
    finally:
        app.dependency_overrides = {}
