import requests
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(path, expected_status=200):
    try:
        response = requests.get(f"{BASE_URL}{path}", timeout=5)
        status = "✅ PASS" if response.status_code == expected_status else "❌ FAIL"
        print(f"{status} | {path} | Status: {response.status_code}")
        return response
    except Exception as e:
        print(f"❌ ERROR | {path} | {str(e)}")
        return None

print("=" * 80)
print("🧪 TESTANDO INNOVATION.IA - SISTEMA COMPLETO")
print("=" * 80)

# 1. Páginas Frontend
print("\n📄 PÁGINAS FRONTEND:")
test_endpoint("/")
test_endpoint("/login")
test_endpoint("/dashboard")
test_endpoint("/vagas")
test_endpoint("/candidatos")
test_endpoint("/configuracoes")

# 2. API Dashboard
print("\n📊 API DASHBOARD:")
test_endpoint("/api/dashboard/metrics")
test_endpoint("/api/dashboard/calendar")
test_endpoint("/api/dashboard/kanban")
test_endpoint("/api/dashboard/recent-activity")

# 3. API Jobs
print("\n💼 API VAGAS:")
test_endpoint("/api/jobs")

# 4. API Interviews
print("\n📅 API ENTREVISTAS:")
test_endpoint("/api/interviews")
test_endpoint("/api/interviews/calendar")

# 5. Health Check
print("\n🏥 HEALTH CHECK:")
test_endpoint("/health")
test_endpoint("/api/stats")

# 6. Assets
print("\n🎨 ASSETS:")
test_endpoint("/static/common/css/design-system.css")

print("\n" + "=" * 80)
print("✅ TESTES CONCLUÍDOS!")
print("=" * 80)
