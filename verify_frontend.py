from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Verify Homepage
        print("Navigating to homepage...")
        page.goto("http://localhost:3000")
        page.wait_for_load_state("networkidle")
        page.screenshot(path="verification_home.png")
        print("Homepage screenshot saved.")

        # Verify Chat AI Page
        print("Navigating to Chat AI page...")
        page.goto("http://localhost:3000/chat-ia")
        page.wait_for_load_state("networkidle")

        # Check if the header with the updated class exists
        # In chat-ia/page.tsx, the header has 'bg-zinc-950/50' (was bg-gray-950/50)
        # We can try to select it and check computed style, but just screenshot is enough for now to prove it renders.

        page.screenshot(path="verification_chat_ia.png")
        print("Chat AI screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run()
