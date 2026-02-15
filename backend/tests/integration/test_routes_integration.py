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

    # Access Dashboard without cookie (should redirect)
    # Note: TestClient handles cookies automatically if set in previous requests?
    # No, POST /api/auth/login returns token in body, not cookie.

    # Clear cookies just in case
    client.cookies.clear()

    response = client.get("/dashboard", follow_redirects=False)
    # 307 Temporary Redirect is default for RedirectResponse
    assert response.status_code == 307

    # Access Dashboard with cookie
    client.cookies.set("access_token", token)
    response = client.get("/dashboard")
    assert response.status_code == 200
