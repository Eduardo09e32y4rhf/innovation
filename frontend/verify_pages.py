from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content("""
        <html>
            <body>
                <button
                    class="p-1 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    aria-label="Fechar aviso"
                    id="close-btn"
                >
                    X
                </button>
            </body>
        </html>
    """)

    # Assert aria-label
    btn = page.locator("#close-btn")
    assert btn.get_attribute("aria-label") == "Fechar aviso"

    browser.close()
