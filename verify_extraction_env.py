import sys

def verify():
    results = {}
    
    # 1. HTTPX
    try:
        import httpx
        results["HTTPX"] = f"OK (v{httpx.__version__})"
    except ImportError as e:
        results["HTTPX"] = f"FAILED: {e}"

    # 2. BeautifulSoup4
    try:
        import bs4
        results["BeautifulSoup4"] = f"OK (v{bs4.__version__})"
    except ImportError as e:
        results["BeautifulSoup4"] = f"FAILED: {e}"

    # 3. Playwright
    try:
        import playwright
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content("<html><body><h1>Workspace Ready</h1></body></html>")
            text = page.locator("h1").inner_text()
            browser.close()
        results["Playwright (Chromium)"] = f"OK - Verified execution: '{text}'"
    except Exception as e:
        results["Playwright (Chromium)"] = f"FAILED: {e}"

    # 4. PyMuPDF
    try:
        import fitz  # PyMuPDF legacy/standard namespace
        import pymupdf
        results["PyMuPDF"] = f"OK (v{pymupdf.__version__})"
    except ImportError as e:
        results["PyMuPDF"] = f"FAILED: {e}"

    # 5. Pandas
    try:
        import pandas as pd
        results["Pandas"] = f"OK (v{pd.__version__})"
    except ImportError as e:
        results["Pandas"] = f"FAILED: {e}"

    print("\n--- Extraction Dependency Verification ---")
    for lib, status in results.items():
        print(f"[{'PASS' if 'OK' in status else 'FAIL'}] {lib}: {status}")

if __name__ == "__main__":
    verify()