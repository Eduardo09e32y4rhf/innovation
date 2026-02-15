import pytest


def test_login_flow(client):
    # Register
    register_data = {
        "email": "test@company.com",
        "password": "securepassword",
        "name": "Test User",
        "company_name": "Test Corp",
        "razao_social": "Test Corp Ltda",
        "cnpj": "12345678000199",
        "cidade": "Sao Paulo",
        "uf": "SP",
        "phone": "11999999999",
    }

    response = client.post("/api/auth/register", json=register_data)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200

    # Login
    login_payload = {"email": "test@company.com", "password": "securepassword"}
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Access API Dashboard without token (should fail 401)
    client.headers.clear() # clear previous headers if any
    response = client.get("/api/dashboard/metrics")
    assert response.status_code == 401

    # Access API Dashboard with token
    client.headers.update({"Authorization": f"Bearer {token}"})
    response = client.get("/api/dashboard/metrics")
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
