import sys
import os
import asyncio
from unittest.mock import MagicMock

# 1. Setup Mocks for external libs
mock_fastapi = MagicMock()


def side_effect_decorator(*args, **kwargs):
    def decorator(func):
        return func

    return decorator


# Configure router.post to return the function identity decorator
mock_fastapi.APIRouter.return_value.post.side_effect = side_effect_decorator
sys.modules["fastapi"] = mock_fastapi

sys.modules["mercadopago"] = MagicMock()
sys.modules["sqlalchemy"] = MagicMock()
sys.modules["sqlalchemy.orm"] = MagicMock()

# 2. Setup Mocks for internal modules
mock_config = MagicMock()
mock_config.settings.MP_ACCESS_TOKEN = "TEST"
mock_config.settings.BASE_URL = "http://test"
sys.modules["core.config"] = mock_config

sys.modules["infrastructure.database.sql.dependencies"] = MagicMock()
sys.modules["api.v1.endpoints.auth"] = MagicMock()


# Define Mock Models
class User:
    id = 1  # Column mock

    def __init__(self, id, email, subscription_status="inactive"):
        self.id = id
        self.email = email
        self.subscription_status = subscription_status
        self.subscription_plan = "starter"
        self.is_active = False


class Company:
    id = 10  # Column mock
    owner_user_id = 1  # Column mock

    def __init__(self, id, owner_user_id, status="active"):
        self.id = id
        self.owner_user_id = owner_user_id
        self.status = status


class Subscription:
    user_id = 1  # Column mock
    company_id = 10
    created_at = "date"

    def __init__(self, user_id, company_id, plan_id, mp_preapproval_id, status):
        self.user_id = user_id
        self.company_id = company_id
        self.plan_id = plan_id
        self.mp_preapproval_id = mp_preapproval_id
        self.status = status


# Mock domain modules to return our classes
mock_user_mod = MagicMock()
mock_user_mod.User = User
sys.modules["domain.models.user"] = mock_user_mod

mock_company_mod = MagicMock()
mock_company_mod.Company = Company
sys.modules["domain.models.company"] = mock_company_mod

mock_sub_mod = MagicMock()
mock_sub_mod.Subscription = Subscription
sys.modules["domain.models.subscription"] = mock_sub_mod

# 3. Import target module
sys.path.append(os.path.abspath("backend/src"))
from api.v1.endpoints.payments import mp_webhook, sdk

# 4. Setup Test Data
mock_user_instance = User(
    id=1, email="test@example.com", subscription_status="inactive"
)
mock_company_instance = Company(id=10, owner_user_id=1, status="active")

# Mock DB Session
mock_db = MagicMock()
# Setup query side effects: User, Company, Subscription
mock_db.query.return_value.filter.return_value.first.side_effect = [
    mock_user_instance,
    mock_company_instance,
    None,
]

# Mock MP SDK
sdk.preapproval.return_value.get.return_value = {
    "status": 200,
    "response": {
        "status": "authorized",
        "external_reference": "1",
        "auto_recurring": {"transaction_amount": 99.90},
    },
}


# Mock Request
class MockRequest:
    def __init__(self, json_data):
        self._json_data = json_data

    async def json(self):
        return self._json_data


req = MockRequest(
    {"type": "subscription_preapproval", "data": {"id": "preapproval_123"}}
)


async def run_test():
    print("Running Webhook Test (Mocked Environment)...")
    try:
        await mp_webhook(req, mock_db)

        # Verify User updated
        print(f"User Status: {mock_user_instance.subscription_status}")
        print(f"User Plan: {mock_user_instance.subscription_plan}")

        if (
            mock_user_instance.subscription_status == "active"
            and mock_user_instance.subscription_plan == "pro"
        ):
            print("PASS: User updated correctly")
        else:
            print("FAIL: User not updated correctly")

        # Verify Subscription created
        if mock_db.add.called:
            args = mock_db.add.call_args[0][0]
            if isinstance(args, Subscription):
                print(
                    f"PASS: Subscription added: Status={args.status}, PlanID={args.plan_id}, CompanyID={args.company_id}"
                )
            else:
                print("FAIL: db.add called with wrong object")
        else:
            print("FAIL: Subscription not added")

    except Exception as e:
        print(f"FAIL: Exception occurred: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run_test())
