import unittest
from unittest.mock import MagicMock
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from api.main import app
from domain.models.user import User
from domain.models.interview import Interview
from domain.models.application import Application
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user

class TestInterviewsAPI(unittest.TestCase):
    def setUp(self):
        self.mock_db = MagicMock(spec=Session)
        self.client = TestClient(app)

        # Mock dependencies
        app.dependency_overrides[get_db] = lambda: self.mock_db
        app.dependency_overrides[get_current_user] = lambda: User(
            id=1, email="test@company.com", role="company"
        )

    def tearDown(self):
        app.dependency_overrides = {}

    def test_list_interviews(self):
        response = self.client.get("/api/interviews")
        self.assertIn(response.status_code, [200, 201, 422])

    def test_schedule_interview(self):
        payload = {
            "application_id": 1,
            "interviewer_id": 2,
            "scheduled_date": datetime.now().isoformat(),
            "type": "technical",
            "location": "Zoom",
            "notes": "Test interview",
        }

        response = self.client.post("/api/interviews", json=payload)
        self.assertIn(response.status_code, [200, 201, 422])

if __name__ == "__main__":
    unittest.main()
