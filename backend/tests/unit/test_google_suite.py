import pytest
from datetime import datetime
import sys
import os

# Ensure backend/src is in path
sys.path.append(os.path.join(os.getcwd(), "backend/src"))

from services.google_suite import google_suite_service

@pytest.mark.asyncio
async def test_create_meeting_stub():
    # Setup
    user_email = "recruiter@innovation.ia"
    summary = "Interview with Candidate X"
    start_time = datetime(2023, 10, 25, 14, 0, 0) # Fixed date

    # Execute
    result = await google_suite_service.create_meeting(
        user_email=user_email,
        summary=summary,
        start_time=start_time,
        attendees=["candidate@example.com"]
    )

    # Assertions
    assert result["summary"] == summary
    assert "hangoutLink" in result
    assert result["hangoutLink"].startswith("https://meet.google.com/")
    assert result["start"]["dateTime"] == "2023-10-25T14:00:00"

@pytest.mark.asyncio
async def test_list_events_stub():
    # Setup
    user_email = "recruiter@innovation.ia"

    # Execute
    events = await google_suite_service.list_calendar_events(user_email, max_results=5)

    # Assertions
    assert isinstance(events, list)
    assert len(events) == 5
    assert "summary" in events[0]
    assert "hangoutLink" in events[0]
