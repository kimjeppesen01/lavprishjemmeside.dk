"""
tools/browser.py — Headless browser via Playwright for page fetching + JS rendering.

Use this when:
  - web.search returns a URL you need to read in full
  - The page requires JavaScript rendering (SPAs, dashboards)
  - You need to extract structured data from a specific page

Use web.search instead when:
  - You only need snippets/summaries
  - You're doing exploratory research across many URLs

The tool extracts visible text only — no HTML, no scripts, no styles.
BeautifulSoup strips tags after Playwright renders the page.
"""
from __future__ import annotations

import logging
from typing import Any

from bs4 import BeautifulSoup

from tools.base import BaseTool, ToolError

logger = logging.getLogger(__name__)

MAX_CHARS = 8_000  # Prevent huge pages from filling the context window


class BrowserTool(BaseTool):
    def __init__(self, headless: bool = True) -> None:
        self._headless = headless

    @property
    def name(self) -> str:
        return "browser_fetch"

    @property
    def description(self) -> str:
        return (
            "Fetch a URL using a headless browser (JavaScript rendering enabled). "
            "Returns the visible page text, truncated to 8000 chars. "
            "Use for pages that don't work with plain HTTP fetch."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL to fetch.",
                },
                "wait_for": {
                    "type": "string",
                    "description": (
                        "Optional CSS selector to wait for before extracting text. "
                        "Useful for SPAs that load content dynamically."
                    ),
                },
                "max_chars": {
                    "type": "integer",
                    "description": "Max characters to return (default 8000).",
                    "default": 8000,
                },
            },
            "required": ["url"],
        }

    @property
    def requires_approval(self) -> bool:
        return False

    def run(self, inputs: dict[str, Any]) -> str:
        from playwright.sync_api import TimeoutError as PlaywrightTimeout
        from playwright.sync_api import sync_playwright

        url: str = inputs["url"].strip()
        wait_for: str | None = inputs.get("wait_for")
        max_chars: int = min(int(inputs.get("max_chars", MAX_CHARS)), MAX_CHARS)

        if not url.startswith(("http://", "https://")):
            raise ToolError(f"Invalid URL (must start with http/https): {url}")

        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=self._headless)
                page = browser.new_page()
                page.set_extra_http_headers({"User-Agent": "Mozilla/5.0 (personal-agent/1.0)"})

                page.goto(url, timeout=15_000, wait_until="domcontentloaded")

                if wait_for:
                    try:
                        page.wait_for_selector(wait_for, timeout=5_000)
                    except PlaywrightTimeout:
                        logger.warning("browser: wait_for selector '%s' timed out", wait_for)

                html = page.content()
                browser.close()

        except PlaywrightTimeout as exc:
            raise ToolError(f"Page load timed out: {url}") from exc
        except Exception as exc:
            raise ToolError(f"Browser error: {exc}") from exc

        # Strip HTML to plain text
        soup = BeautifulSoup(html, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        # Collapse excessive blank lines
        lines = [line for line in text.splitlines() if line.strip()]
        text = "\n".join(lines)

        if len(text) > max_chars:
            text = text[:max_chars] + f"\n\n[Truncated at {max_chars} chars]"

        return text or "(Page returned no readable text)"
