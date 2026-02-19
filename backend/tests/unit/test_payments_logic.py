import sys
import os
from unittest.mock import MagicMock, patch

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../src"))

from api.v1.endpoints import payments
from domain.models.user import User


def test_create_preference_calls_preapproval():
    # Mock settings
    payments.settings = MagicMock()
    payments.settings.BASE_URL = "http://test.com"

    # Mock SDK
    mock_sdk = MagicMock()
    payments.sdk = mock_sdk

    # Mock preapproval response
    mock_sdk.preapproval.return_value.create.return_value = {
        "response": {
            "init_point": "http://mercadopago.com/checkout",
            "id": "preapproval-123",
        }
    }

    # Mock current user
    user = User(id=1, email="test@test.com", full_name="Test User")

    # Call the function (we need to await it since it's async)
    import asyncio

    result = asyncio.run(payments.create_preference("pro", current_user=user))

    # Verify
    assert result["checkout_url"] == "http://mercadopago.com/checkout"
    assert result["preapproval_id"] == "preapproval-123"

    # Check arguments
    mock_sdk.preapproval.return_value.create.assert_called_once()
    call_args = mock_sdk.preapproval.return_value.create.call_args[0][0]

    assert call_args["auto_recurring"]["frequency"] == 1
    assert call_args["auto_recurring"]["frequency_type"] == "months"
    assert call_args["payer_email"] == "test@test.com"
    print("SUCCESS: create_preference calls preapproval correctly")


if __name__ == "__main__":
    test_create_preference_calls_preapproval()
