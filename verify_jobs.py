from playwright.sync_api import sync_playwright


def run_cuj(page):
    page.goto("http://localhost:3000/jobs")
    page.wait_for_timeout(500)

    # 1. Search input focus test
    search_input = page.get_by_placeholder("Buscar vagas por título ou skills...")
    search_input.focus()
    page.wait_for_timeout(500)

    # 2. Open modal by clicking a job
    # Ensure there is at least one job by mocking or just clicking the first available job card
    # Assuming there are job cards rendered
    job_cards = page.locator(".group.cursor-pointer")
    if job_cards.count() > 0:
        job_cards.first.click()
        page.wait_for_timeout(500)

        # 3. Focus the modal close button
        close_btn = page.locator("button[aria-label='Fechar modal']")
        close_btn.focus()
        page.wait_for_timeout(500)

        # Take screenshot of the focused close button
        page.screenshot(path="/home/jules/verification/screenshots/verification.png")
        page.wait_for_timeout(500)

        # Close the modal
        close_btn.click()
        page.wait_for_timeout(500)
    else:
        # If no jobs, we take a screenshot of the search input focused
        page.screenshot(path="/home/jules/verification/screenshots/verification.png")

    page.wait_for_timeout(1000)


if __name__ == "__main__":
    import os

    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/home/jules/verification/videos", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={"width": 1280, "height": 720},
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
