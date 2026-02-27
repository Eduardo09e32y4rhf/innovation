import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from datetime import datetime

# Adjust imports to match the actual project structure
import sys
import os
sys.path.append(os.path.abspath("backend/src"))

from api.main import app
from core.roles import Role
from domain.models.user import User
from domain.models.company import Company
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user

# Mock database dependency
def override_get_db():
    try:
        db = MagicMock(spec=Session)
        yield db
    finally:
        pass

# Mock user dependency
def override_get_current_user():
    user = User(id=1, email="test@example.com", role="candidate")
    return user

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def test_create_company_success():
    # Arrange
    payload = {
        "razao_social": "Test Company Ltda",
        "cnpj": "12.345.678/0001-90",
        "cidade": "Osasco",
        "uf": "SP"
    }

    # Mock DB behavior
    mock_db = MagicMock(spec=Session)
    app.dependency_overrides[get_db] = lambda: mock_db

    # Mock query results
    mock_db.query.return_value.filter.return_value.first.return_value = None # No existing company

    # Act
    response = client.post("/companies", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["razao_social"] == payload["razao_social"]
    assert data["cnpj"] == payload["cnpj"]

    # Verify DB interactions
    assert mock_db.add.call_count >= 1 # Should add company and update user
    assert mock_db.commit.call_count == 1

def test_create_company_missing_fields():
    # Arrange
    payload = {
        "razao_social": "Test Company Ltda"
        # Missing cnpj, cidade, uf
    }

    # Act
    response = client.post("/companies", json=payload)

    # Assert
    assert response.status_code == 400
    assert "Campos obrigatórios" in response.json()["detail"]

def test_create_company_already_exists():
    # Arrange
    payload = {
        "razao_social": "Test Company Ltda",
        "cnpj": "12.345.678/0001-90",
        "cidade": "Osasco",
        "uf": "SP"
    }

    # Mock DB behavior
    mock_db = MagicMock(spec=Session)
    app.dependency_overrides[get_db] = lambda: mock_db

    # Mock existing company
    existing_company = Company(id=1, owner_user_id=1, razao_social="Existing", cnpj="000", cidade="X", uf="X")
    mock_db.query.return_value.filter.return_value.first.return_value = existing_company

    # Act
    response = client.post("/companies", json=payload)

    # Assert
    assert response.status_code == 409
    assert "Empresa já cadastrada" in response.json()["detail"]
