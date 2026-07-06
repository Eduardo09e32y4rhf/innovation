import urllib.request
import json

data = {
    "title": "teste",
    "message": "teste msg",
    "type": "WARNING",
    "priority": "URGENT",
    "targetType": "SPECIFIC",
    "targetIds": ["c7a40306-6927-4a0d-b169-23f2f45cc312"],
    "requiresReadConfirmation": True,
    "requiresAcceptance": True,
    "allowsRefusal": False,
    "extraJson": {
        "legalReason": "Desidia...",
        "occurrenceDate": "2026-07-01",
        "suspensionDays": "1"
    }
}

req = urllib.request.Request(
    'http://localhost:3001/notifications/admin',
    data=json.dumps(data).encode('utf-8'),
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
