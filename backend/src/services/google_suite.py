from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class GoogleSuiteService:
    """
    Service to handle Google Suite integrations (Calendar, Meet).

    NOTE: Currently operates as a STUB. Real implementation requires storing
    OAuth refresh tokens for each user to build authorized credentials.
    """

    def __init__(self):
        # In a real implementation, we would inject a credentials repository here
        pass

    async def create_meeting(
        self,
        user_email: str,
        summary: str,
        start_time: datetime,
        duration_minutes: int = 60,
        attendees: List[str] = [],
    ) -> Dict[str, Any]:
        """
        Creates a Google Meet event on the user's primary calendar.
        """
        end_time = start_time + timedelta(minutes=duration_minutes)

        # Structure for Google Calendar API v3
        event_body = {
            "summary": summary,
            "description": "Interview scheduled via Innovation.ia",
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": "UTC",
            },
            "attendees": [{"email": email} for email in attendees],
            "conferenceData": {
                "createRequest": {
                    "requestId": f"innovation-{int(start_time.timestamp())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
        }

        logger.info(f"[STUB] Creating Google Meeting for {user_email}: {summary}")

        # Mock Response
        return {
            "kind": "calendar#event",
            "etag": '"3416492348523000"',
            "id": "mock_event_id_12345",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=mock",
            "created": datetime.utcnow().isoformat() + "Z",
            "updated": datetime.utcnow().isoformat() + "Z",
            "summary": summary,
            "creator": {"email": user_email},
            "organizer": {"email": user_email},
            "start": event_body["start"],
            "end": event_body["end"],
            "hangoutLink": "https://meet.google.com/abc-defg-hij",  # Mock Meet Link
            "conferenceData": {
                "entryPoints": [
                    {
                        "entryPointType": "video",
                        "uri": "https://meet.google.com/abc-defg-hij",
                        "label": "meet.google.com/abc-defg-hij",
                    }
                ]
            },
        }

    async def list_calendar_events(
        self, user_email: str, max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Lists upcoming events from the user's primary calendar.
        """
        logger.info(f"[STUB] Listing Calendar Events for {user_email}")

        now = datetime.utcnow()
        events = []

        for i in range(max_results):
            start = now + timedelta(days=i)
            end = start + timedelta(hours=1)
            events.append(
                {
                    "id": f"event_{i}",
                    "summary": f"Interview {i+1} - Innovation.ia",
                    "start": {"dateTime": start.isoformat() + "Z"},
                    "end": {"dateTime": end.isoformat() + "Z"},
                    "hangoutLink": "https://meet.google.com/mock-link",
                }
            )

        return events


# Singleton instance
google_suite_service = GoogleSuiteService()
