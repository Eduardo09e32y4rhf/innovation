import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.api.main import app
from src.domain.models.user import User
from src.domain.models.interview import Interview
from src.domain.models.application import Application
from src.domain.models.job import Job
from src.infrastructure.database.sql.dependencies import get_db
from src.core.dependencies import get_current_user

class TestInterviewsAPI(unittest.TestCase):
    def setUp(self):
        self.mock_db = MagicMock(spec=Session)
        self.client = TestClient(app)

        # Mock dependencies
        app.dependency_overrides[get_db] = lambda: self.mock_db
        app.dependency_overrides[get_current_user] = lambda: User(id=1, email="test@company.com", role="company", active_company_id=1)

    def tearDown(self):
        app.dependency_overrides = {}

    def test_list_interviews(self):
        # Mock query chain
        mock_interview = MagicMock(spec=Interview)
        mock_interview.id = 1
        mock_interview.status = "scheduled"
        mock_interview.scheduled_date = datetime.now()
        mock_interview.candidate.name = "John Doe"
        mock_interview.application.job.title = "Developer"
        mock_interview.interviewer.name = "Recruiter"

        self.mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_interview]

        response = self.client.get("/api/interviews")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["interviews"]), 1)
        self.assertEqual(response.json()["interviews"][0]["candidate_name"], "John Doe")

    def test_schedule_interview(self):
        # Mock application existence
        mock_app = MagicMock(spec=Application)
        mock_app.id = 1
        mock_app.candidate_id = 100
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_app

        payload = {
            "application_id": 1,
            "interviewer_id": 2,
            "scheduled_date": datetime.now().isoformat(),
            "type": "technical",
            "location": "Zoom",
            "notes": "Test interview"
        }

        response = self.client.post("/api/interviews", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertIn("interview_id", response.json())
        self.mock_db.add.assert_called_once()
        self.mock_db.commit.assert_called_once()

if __name__ == "__main__":
    unittest.main()
