"""
tools/web_search.py — Rate-limited web search with DuckDuckGo + Brave fallback.

Rate limiting enforced per config:
  - 10s minimum between searches
  - Max 5 searches per batch, then 2-minute break
  - On failure: returns error string, never raises

Priority:
  1. Brave Search API (if BRAVE_SEARCH_API_KEY is set)
  2. DuckDuckGo (free, no key required)
"""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from duckduckgo_search import DDGS

from agent.config import Config
from tools.base import BaseTool, ToolError

logger = logging.getLogger(__name__)


class WebSearchTool(BaseTool):
    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg
        self._last_search_ts: float = 0.0
        self._batch_count: int = 0
        self._batch_started_at: float = 0.0

    @property
    def name(self) -> str:
        return "web_search"

    @property
    def description(self) -> str:
        return (
            "Search the web for current information. Returns up to 5 results "
            "with title, URL, and snippet. Rate-limited: 10s between searches, "
            "max 5 per batch then 2-minute break."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query.",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Max results to return (1-5, default 5).",
                    "default": 5,
                },
            },
            "required": ["query"],
        }

    @property
    def requires_approval(self) -> bool:
        return False

    def _enforce_rate_limit(self) -> None:
        """Block until rate limits allow the next search."""
        # Min gap between searches
        elapsed = time.time() - self._last_search_ts
        min_gap = self._cfg.rate.min_seconds_between_searches
        if elapsed < min_gap:
            wait = min_gap - elapsed
            logger.debug("web_search: rate limit wait %.1fs", wait)
            time.sleep(wait)

        # Batch limit
        max_batch = self._cfg.rate.max_searches_per_batch
        break_secs = self._cfg.rate.search_batch_break_seconds

        if self._batch_count >= max_batch:
            batch_elapsed = time.time() - self._batch_started_at
            if batch_elapsed < break_secs:
                wait = break_secs - batch_elapsed
                logger.info("web_search: batch limit reached, sleeping %.0fs", wait)
                time.sleep(wait)
            self._batch_count = 0
            self._batch_started_at = time.time()

        if self._batch_count == 0:
            self._batch_started_at = time.time()

    def run(self, inputs: dict[str, Any]) -> str:
        query: str = inputs["query"].strip()
        max_results: int = min(int(inputs.get("max_results", 5)), 5)

        if not query:
            raise ToolError("Query cannot be empty")

        self._enforce_rate_limit()
        self._last_search_ts = time.time()
        self._batch_count += 1

        # Try Brave first if key is available
        if self._cfg.search.brave_api_key:
            try:
                return self._brave_search(query, max_results)
            except Exception as exc:
                logger.warning("Brave search failed (%s), falling back to DDG", exc)

        return self._ddg_search(query, max_results)

    def _brave_search(self, query: str, max_results: int) -> str:
        url = "https://api.search.brave.com/res/v1/web/search"
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self._cfg.search.brave_api_key,
        }
        resp = httpx.get(
            url,
            params={"q": query, "count": max_results},
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("web", {}).get("results", [])
        return self._format_results(results, key_title="title", key_url="url", key_desc="description")

    def _ddg_search(self, query: str, max_results: int) -> str:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        return self._format_results(results, key_title="title", key_url="href", key_desc="body")

    def _format_results(
        self,
        results: list[dict],
        key_title: str,
        key_url: str,
        key_desc: str,
    ) -> str:
        if not results:
            return "No results found."
        lines = []
        for i, r in enumerate(results, 1):
            title = r.get(key_title, "No title")
            url = r.get(key_url, "")
            desc = r.get(key_desc, "")[:300]
            lines.append(f"{i}. **{title}**\n   {url}\n   {desc}")
        return "\n\n".join(lines)
