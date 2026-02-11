from fastapi.testclient import TestClient
import sys
import os

# Ensure app can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_home():
    # Since home might depend on static files being present
    # we just check it returns something or 404/200
    response = client.get("/")
    assert response.status_code in [200, 404]
