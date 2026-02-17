from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Add backend/src to path for imports
sys.path.append(os.path.join(os.getcwd(), "backend/src"))

from api.main import app
from domain.models.user import User
from infrastructure.database.sql.dependencies import get_db
from api.v1.endpoints.auth import get_current_user

client = TestClient(app)


# Mock user dependency
async def override_get_current_user():
    # Return a dummy user with ID 1
    return User(id=1, email="test@innovation.ia", full_name="Test User", role="company")


# Mock DB dependency
def override_get_db():
    db = MagicMock()
    mock_query = MagicMock()
    mock_filter = MagicMock()

    db.query.return_value = mock_query
    mock_query.filter.return_value = mock_filter

    # Return a user object when first() is called
    user = User(id=1, email="test@innovation.ia", subscription_status="inactive")
    mock_filter.first.return_value = user

    yield db


# Use the function object as key
app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_db] = override_get_db


def test_create_subscription():
    with patch("api.v1.endpoints.payments.sdk") as mock_sdk:
        mock_preapproval = MagicMock()
        mock_sdk.preapproval.return_value = mock_preapproval

        mock_preapproval.create.return_value = {
            "response": {
                "init_point": "https://mercadopago.com/checkout/123",
                "id": "preapproval_123",
            }
        }

        response = client.post("/api/payments/create-subscription/pro")

        if response.status_code != 200:
            print(f"FAILED: {response.json()}")

        assert response.status_code == 200
        data = response.json()
        assert data["checkout_url"] == "https://mercadopago.com/checkout/123"
        assert data["id"] == "preapproval_123"

        args, _ = mock_preapproval.create.call_args
        payload = args[0]
        assert payload["reason"] == "Assinatura Innovation.ia - Pro"


def test_webhook_subscription_approved():
    with patch("api.v1.endpoints.payments.sdk") as mock_sdk:
        mock_preapproval = MagicMock()
        mock_sdk.preapproval.return_value = mock_preapproval

        mock_preapproval.get.return_value = {
            "status": 200,
            "response": {
                "status": "authorized",
                "external_reference": "1",
                "reason": "Assinatura Innovation.ia - Pro",
            },
        }

        webhook_payload = {
            "type": "subscription_preapproval",
            "action": "created",
            "data": {"id": "preapproval_123"},
        }

        response = client.post("/api/payments/webhook", json=webhook_payload)

        if response.status_code != 200:
            print(f"WEBHOOK FAILED: {response.json()}")

        assert response.status_code == 200
        assert response.json() == {"status": "received"}

        mock_preapproval.get.assert_called_with("preapproval_123")
