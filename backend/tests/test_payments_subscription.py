from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from api.main import app
from domain.models.user import User
from api.v1.endpoints.auth import get_current_user
from infrastructure.database.sql.dependencies import get_db

client = TestClient(app)

# Mock user
async def mock_get_current_user_impl():
    # Return a dummy user
    user = MagicMock(spec=User)
    user.id = 1
    user.email = "test@innovation.ia"
    user.full_name = "Test User"
    user.role = "company"
    return user

# Mock DB
def mock_get_db():
    try:
        db = MagicMock()
        yield db
    finally:
        pass

# Apply overrides
app.dependency_overrides[get_current_user] = mock_get_current_user_impl
app.dependency_overrides[get_db] = mock_get_db

@patch("api.v1.endpoints.payments.sdk")
def test_create_subscription(mock_sdk_instance):
    # Setup SDK mock
    # mock_sdk_instance is the 'sdk' object in payments.py

    # sdk.preapproval().create(...)
    mock_preapproval = MagicMock()
    mock_preapproval.create.return_value = {
        "status": 201,
        "response": {"init_point": "https://mp.com/checkout/123"}
    }

    mock_sdk_instance.preapproval.return_value = mock_preapproval

    # Make request
    response = client.post("/api/payments/create-subscription/pro")

    # Assert
    assert response.status_code == 200, response.text
    assert response.json() == {"checkout_url": "https://mp.com/checkout/123"}
    mock_preapproval.create.assert_called_once()

@patch("api.v1.endpoints.payments.sdk")
def test_webhook_subscription(mock_sdk_instance):
    # Setup SDK mock for 'get' subscription
    mock_preapproval = MagicMock()
    mock_preapproval.get.return_value = {
        "status": 200,
        "response": {
            "status": "authorized",
            "external_reference": "1",
            "reason": "Assinatura Innovation.ia - Plano Pro"
        }
    }
    mock_sdk_instance.preapproval.return_value = mock_preapproval

    # Mock DB
    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    # Create a simpler mock user (just a SimpleNamespace or object)
    # so we don't have MagicMock weirdness on attributes
    class MockUser:
        id = 1
        email = "test@innovation.ia"
        subscription_status = "inactive"
        subscription_plan = "starter"
        is_active = False

    mock_user = MockUser()

    # db.query(User).filter(...).first() -> mock_user
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    # Payload
    payload = {
        "type": "subscription_preapproval",
        "data": {"id": "sub_123"}
    }

    # Execute
    response = client.post("/api/payments/webhook", json=payload)

    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "received"}

    # Check if user was updated
    assert mock_user.subscription_status == "active"
    assert mock_user.subscription_plan == "pro"
    mock_db.commit.assert_called_once()
