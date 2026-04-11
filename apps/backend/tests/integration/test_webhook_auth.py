import os
import sys

# Setup for testing within the specific env
sys.path.insert(0, os.path.abspath("backend/src"))

import unittest
from fastapi.testclient import TestClient
from api.main import app


class TestWebhooks(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.original_secret = os.environ.get("N8N_WEBHOOK_SECRET")

    def tearDown(self):
        if self.original_secret is not None:
            os.environ["N8N_WEBHOOK_SECRET"] = self.original_secret
        elif "N8N_WEBHOOK_SECRET" in os.environ:
            del os.environ["N8N_WEBHOOK_SECRET"]

    def test_n8n_webhook_missing_secret(self):
        # When N8N_WEBHOOK_SECRET is set but not provided
        os.environ["N8N_WEBHOOK_SECRET"] = "secret_123"
        response = self.client.post(
            "/api/webhooks/n8n/callback", json={"event": "test"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Não autorizado"})

    def test_n8n_webhook_invalid_secret(self):
        # When N8N_WEBHOOK_SECRET is set but incorrect
        os.environ["N8N_WEBHOOK_SECRET"] = "secret_123"
        response = self.client.post(
            "/api/webhooks/n8n/callback",
            headers={"X-N8N-Webhook-Secret": "invalid"},
            json={"event": "test"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Não autorizado"})

    def test_n8n_webhook_valid_secret(self):
        # When N8N_WEBHOOK_SECRET is set and valid
        os.environ["N8N_WEBHOOK_SECRET"] = "secret_123"
        # Not creating real DB objects so it should just return 200 without doing much
        response = self.client.post(
            "/api/webhooks/n8n/callback",
            headers={"X-N8N-Webhook-Secret": "secret_123"},
            json={"event": "test"},
        )
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
