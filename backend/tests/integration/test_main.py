from fastapi.testclient import TestClient
import sys
import os
from pathlib import Path
import httpx  # Ensure httpx is installed

# Add backend/src to python path
BASE_DIR = Path(__file__).resolve().parents[2]
SRC_DIR = BASE_DIR / "src"
sys.path.append(str(SRC_DIR))

from api.main import app

# Instantiate TestClient
client = TestClient(app)


def test_read_main():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_stats():
    response = client.get("/api/stats")
    assert response.status_code == 200
    assert "vagas_ativas" in response.json()
    assert response.json()["vagas_ativas"] == 12


def test_home_page():
    response = client.get("/")
    assert response.status_code == 200
    # Verifica se contém o título ou algo da landing page
    assert "Innovation.ia" in response.text


def test_login_page():
    response = client.get("/login")
    assert response.status_code == 200
    assert "Login" in response.text
