from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os
from datetime import datetime
from decimal import Decimal

# Add backend/src to path
sys.path.append(os.path.join(os.getcwd(), "backend/src"))

from api.main import app
from domain.models.user import User
from domain.models.finance import Transaction
from infrastructure.database.sql.dependencies import get_db
from api.v1.endpoints.auth import get_current_user

client = TestClient(app)


# Mock User
async def override_get_current_user():
    return User(id=1, email="test@innovation.ia", role="company")


def test_get_transactions():
    # Mock DB specifically for this test
    # We create a new MagicMock for the DB session for this test scope
    mock_db = MagicMock()

    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_order = MagicMock()
    mock_limit = MagicMock()

    mock_db.query.return_value = mock_query
    mock_query.filter.return_value = mock_filter
    mock_filter.order_by.return_value = mock_order
    mock_order.limit.return_value = mock_limit

    tx1 = Transaction(
        id=1,
        description="Sale",
        amount=Decimal("100.00"),
        type="income",
        due_date=datetime.utcnow().date(),
        company_id=1,
        created_at=datetime.utcnow(),
    )
    mock_limit.all.return_value = [tx1]

    # Override dependency ONLY for this test by replacing the override
    app.dependency_overrides[get_db] = lambda: mock_db

    response = client.get("/api/finance/transactions")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["description"] == "Sale"


def test_get_summary():
    # Ensure get_db override is active/valid (simple mock is enough)
    app.dependency_overrides[get_db] = lambda: MagicMock()

    with patch("api.v1.endpoints.finance.finance_service") as mock_service:
        mock_service.get_cash_flow_summary.return_value = {
            "balance": Decimal("1000.00"),
            "total_income": Decimal("2000.00"),
            "total_expenses": Decimal("1000.00"),
            "pending_income": Decimal("500.00"),
            "pending_expenses": Decimal("200.00"),
        }

        response = client.get("/api/finance/summary")

        assert response.status_code == 200
        data = response.json()
        assert data["balance"] == "1000.00"


def test_get_taxes():
    # Ensure get_db override is active/valid
    app.dependency_overrides[get_db] = lambda: MagicMock()

    with patch("api.v1.endpoints.finance.finance_service") as mock_service:
        mock_service.get_tax_summary.return_value = {
            "total_taxes": Decimal("500.00"),
            "breakdown": {
                "DAS": {
                    "total": Decimal("200.00"),
                    "pending": Decimal("200.00"),
                    "paid": Decimal("0.00"),
                    "items": [],
                }
            },
        }

        response = client.get("/api/finance/taxes")

        assert response.status_code == 200
        data = response.json()
        assert data["total_taxes"] == "500.00"
        assert "DAS" in data["breakdown"]


# Global overrides for auth (applied once)
app.dependency_overrides[get_current_user] = override_get_current_user
