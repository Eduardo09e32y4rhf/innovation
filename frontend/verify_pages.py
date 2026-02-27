from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        # Simulate logged in state
        page.add_init_script("localStorage.setItem('token', 'mock_token');")

        # Mock API responses to avoid 401 redirect
        page.route("**/api/auth/me", lambda route: route.fulfill(
            status=200,
            body='{"id": 1, "name": "Test User", "email": "test@example.com", "role": "admin"}'
        ))

        # Mock other dependencies
        page.route("**/api/rh/v2/pdi", lambda route: route.fulfill(status=200, body="[]"))
        page.route("**/api/rh/v2/time-bank/balance", lambda route: route.fulfill(status=200, body='{"total_credit_hours": 0, "total_debit_hours": 0, "balance_hours": 0}'))
        page.route("**/api/rh/v2/payslips/me", lambda route: route.fulfill(status=200, body="[]"))
        page.route("**/api/rh/attendance/history*", lambda route: route.fulfill(status=200, body="[]"))
        page.route("**/api/analytics", lambda route: route.fulfill(
            status=200,
            body='{"summary": {"total_revenue": 1000, "total_expenses": 500, "profit": 500, "active_jobs": 5, "total_candidates": 20}, "history": []}'
        ))

        # 1. RH Page
        print("Navigating to RH Dashboard...")
        try:
            page.goto("http://localhost:3000/dashboard/rh")
            page.wait_for_selector('text=RH Avançado', timeout=10000)
            page.screenshot(path="/home/jules/verification/rh_dashboard.png")
            print("Captured RH Dashboard.")
        except Exception as e:
            print(f"Failed RH: {e}")

        # 2. Ponto Page
        print("Navigating to Ponto...")
        try:
            page.goto("http://localhost:3000/dashboard/ponto")
            page.wait_for_selector('text=Meu Ponto', timeout=10000)
            page.screenshot(path="/home/jules/verification/ponto.png")
            print("Captured Ponto.")
        except Exception as e:
            print(f"Failed Ponto: {e}")

        # 3. Analytics Page
        print("Navigating to Analytics...")
        try:
            page.goto("http://localhost:3000/dashboard/analytics")
            page.wait_for_selector('text=Dashboard Financeiro', timeout=10000)
            page.screenshot(path="/home/jules/verification/analytics.png")
            print("Captured Analytics.")
        except Exception as e:
            print(f"Failed Analytics: {e}")

        browser.close()

if __name__ == "__main__":
    run()
