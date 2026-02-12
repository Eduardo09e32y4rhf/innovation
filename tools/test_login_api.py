import httpx
import json

def test_login():
    url = "http://127.0.0.1:8000/auth/login"
    payload = {
        "email": "admin@innovation.ia",
        "password": "admin123"
    }
    try:
        response = httpx.post(url, json=payload, timeout=10.0)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
