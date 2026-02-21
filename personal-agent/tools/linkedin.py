"""
tools/linkedin.py — LinkedIn automation via Playwright + li_at session cookie.

Auth strategy: inject the li_at session cookie instead of automating login.
  1. Log into linkedin.com in Chrome manually
  2. DevTools → Application → Cookies → www.linkedin.com → copy li_at value
  3. Set LINKEDIN_SESSION_COOKIE=<value> in .env

Anti-detection:
  - Headed (non-headless) browser — less detectable than headless
  - Realistic viewport (1280×800) + genuine User-Agent
  - Random delays (1.5–3.5s) between page interactions
  - No scheduled scraping — only runs when you ask IAN in Slack

All write actions (post, comment, connect, message) require explicit Slack
approval. Read actions (feed, like) do not.
"""
from __future__ import annotations

import logging
import random
import time
from contextlib import contextmanager
from typing import Any, Generator

from bs4 import BeautifulSoup

from agent.config import Config
from tools.base import BaseTool, ToolError

logger = logging.getLogger(__name__)

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)


def _pause(min_s: float = 1.5, max_s: float = 3.5) -> None:
    """Sleep a random human-like interval."""
    time.sleep(random.uniform(min_s, max_s))


@contextmanager
def _session(session_cookie: str) -> Generator[Any, None, None]:
    """
    Playwright context with the li_at session cookie pre-injected.
    Uses headed (non-headless) Chromium for better bot evasion.
    """
    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=_UA,
        )
        # Inject the session cookie before any navigation
        ctx.add_cookies([{
            "name": "li_at",
            "value": session_cookie,
            "domain": ".linkedin.com",
            "path": "/",
            "secure": True,
            "httpOnly": True,
        }])
        page = ctx.new_page()
        try:
            yield page
        finally:
            browser.close()


def _text_from_html(html: str, max_chars: int = 6000) -> str:
    """Strip HTML to readable text."""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    text = "\n".join(lines)
    return text[:max_chars] if len(text) > max_chars else text


# ---------------------------------------------------------------------------
# Feed reader
# ---------------------------------------------------------------------------

class LinkedInFeedTool(BaseTool):
    """Read latest posts from your LinkedIn home feed. No approval required."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "linkedin_feed"

    @property
    def description(self) -> str:
        return (
            "Read the latest posts from your LinkedIn home feed. "
            "Returns post text, author, and URL for each post. "
            "Use this to catch up on your network or find posts to engage with."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "count": {
                    "type": "integer",
                    "description": "Number of posts to return (default 5, max 15).",
                    "default": 5,
                }
            },
        }

    @property
    def requires_approval(self) -> bool:
        return False

    def run(self, inputs: dict[str, Any]) -> str:
        count = min(int(inputs.get("count", 5)), 15)
        cookie = self._cfg.linkedin.session_cookie

        with _session(cookie) as page:
            page.goto("https://www.linkedin.com/feed/", timeout=20_000, wait_until="domcontentloaded")
            _pause()

            # Scroll once to load more posts
            page.evaluate("window.scrollBy(0, 1200)")
            _pause(1.0, 2.0)

            html = page.content()

        soup = BeautifulSoup(html, "lxml")
        posts = soup.select("div.feed-shared-update-v2, div[data-urn]")[:count]

        if not posts:
            # Fallback: return raw text of the page
            return _text_from_html(html, max_chars=4000)

        lines = []
        for i, post in enumerate(posts, 1):
            author_el = post.select_one(".update-components-actor__name, .feed-shared-actor__name")
            text_el = post.select_one(".feed-shared-text, .update-components-text")
            urn = post.get("data-urn", "")

            author = author_el.get_text(strip=True) if author_el else "Unknown"
            text = text_el.get_text(strip=True)[:500] if text_el else "(no text)"
            url = f"https://www.linkedin.com/feed/update/{urn}" if urn else ""

            lines.append(f"{i}. **{author}**\n{text}" + (f"\n{url}" if url else ""))

        return "\n\n".join(lines) if lines else _text_from_html(html, max_chars=4000)


# ---------------------------------------------------------------------------
# Post publisher
# ---------------------------------------------------------------------------

class LinkedInPostTool(BaseTool):
    """Publish a text post to your LinkedIn profile. Requires approval."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "linkedin_post"

    @property
    def description(self) -> str:
        return (
            "Publish a text post to your LinkedIn profile. "
            "Always requires approval before posting. "
            "Keep posts under 3000 characters."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The post content (plain text, up to 3000 chars).",
                }
            },
            "required": ["text"],
        }

    @property
    def requires_approval(self) -> bool:
        return True

    def run(self, inputs: dict[str, Any]) -> str:
        text = inputs["text"].strip()
        if not text:
            raise ToolError("Post text cannot be empty.")
        if len(text) > 3000:
            raise ToolError(f"Post too long ({len(text)} chars). LinkedIn limit is 3000.")

        cookie = self._cfg.linkedin.session_cookie

        with _session(cookie) as page:
            page.goto("https://www.linkedin.com/feed/", timeout=20_000, wait_until="domcontentloaded")
            _pause()

            # Click the "Start a post" / share box
            start_btn = page.locator(
                "button.share-box-feed-entry__trigger, "
                "[data-control-name='share.sharebox_trigger'], "
                "div.share-box-feed-entry__closed-share-box"
            ).first
            if not start_btn.is_visible(timeout=5_000):
                raise ToolError("Could not find the 'Start a post' button. Session may have expired.")
            start_btn.click()
            _pause()

            # Type post content
            editor = page.locator("div.ql-editor, div[contenteditable='true']").first
            editor.wait_for(timeout=8_000)
            editor.click()
            editor.type(text, delay=30)
            _pause()

            # Click Post button
            post_btn = page.locator(
                "button.share-actions__primary-action, "
                "button[data-control-name='share.post']"
            ).first
            post_btn.wait_for(timeout=5_000)
            post_btn.click()
            _pause(2.0, 4.0)

        logger.info("linkedin_post: posted %d chars", len(text))
        return f"Posted successfully ({len(text)} chars)."


# ---------------------------------------------------------------------------
# Liker
# ---------------------------------------------------------------------------

class LinkedInLikeTool(BaseTool):
    """Like a LinkedIn post by URL. No approval required."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "linkedin_like"

    @property
    def description(self) -> str:
        return "Like a LinkedIn post given its URL. No approval needed."

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Full LinkedIn post URL (linkedin.com/feed/update/... or linkedin.com/posts/...).",
                }
            },
            "required": ["url"],
        }

    @property
    def requires_approval(self) -> bool:
        return False

    def run(self, inputs: dict[str, Any]) -> str:
        url = inputs["url"].strip()
        if "linkedin.com" not in url:
            raise ToolError(f"Not a LinkedIn URL: {url}")

        cookie = self._cfg.linkedin.session_cookie

        with _session(cookie) as page:
            page.goto(url, timeout=20_000, wait_until="domcontentloaded")
            _pause()

            like_btn = page.locator(
                "button[aria-label*='Like'], "
                "button.reactions-react-button"
            ).first
            if not like_btn.is_visible(timeout=5_000):
                raise ToolError("Could not find the Like button. The post may require a different URL.")

            # Check if already liked
            aria = like_btn.get_attribute("aria-label") or ""
            if "Unlike" in aria or "unlike" in aria:
                return "Post is already liked."

            like_btn.click()
            _pause(1.0, 2.0)

        logger.info("linkedin_like: liked %s", url)
        return f"Liked: {url}"


# ---------------------------------------------------------------------------
# Commenter
# ---------------------------------------------------------------------------

class LinkedInCommentTool(BaseTool):
    """Comment on a LinkedIn post. Requires approval."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "linkedin_comment"

    @property
    def description(self) -> str:
        return (
            "Post a comment on a LinkedIn post given its URL. "
            "Always requires approval before posting."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Full LinkedIn post URL.",
                },
                "comment": {
                    "type": "string",
                    "description": "The comment text (up to 1250 chars).",
                },
            },
            "required": ["url", "comment"],
        }

    @property
    def requires_approval(self) -> bool:
        return True

    def run(self, inputs: dict[str, Any]) -> str:
        url = inputs["url"].strip()
        comment = inputs["comment"].strip()
        if not comment:
            raise ToolError("Comment text cannot be empty.")
        if len(comment) > 1250:
            raise ToolError(f"Comment too long ({len(comment)} chars). LinkedIn limit is 1250.")

        cookie = self._cfg.linkedin.session_cookie

        with _session(cookie) as page:
            page.goto(url, timeout=20_000, wait_until="domcontentloaded")
            _pause()

            # Open comment box
            comment_btn = page.locator(
                "button[aria-label*='comment'], button.comment-button"
            ).first
            comment_btn.click()
            _pause()

            editor = page.locator("div.ql-editor[data-placeholder*='comment'], div.comments-comment-box div[contenteditable='true']").first
            editor.wait_for(timeout=8_000)
            editor.click()
            editor.type(comment, delay=30)
            _pause()

            submit_btn = page.locator(
                "button.comments-comment-box__submit-button, "
                "button[data-control-name='comment.submit']"
            ).first
            submit_btn.wait_for(timeout=5_000)
            submit_btn.click()
            _pause(2.0, 4.0)

        logger.info("linkedin_comment: commented on %s", url)
        return f"Comment posted on {url}"


# ---------------------------------------------------------------------------
# Connection requester
# ---------------------------------------------------------------------------

class LinkedInConnectTool(BaseTool):
    """Send a connection request with a personalised note. Requires approval."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "linkedin_connect"

    @property
    def description(self) -> str:
        return (
            "Send a LinkedIn connection request to a profile URL with a personalised note. "
            "Always requires approval. Note must be ≤300 chars."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "profile_url": {
                    "type": "string",
                    "description": "LinkedIn profile URL (linkedin.com/in/...).",
                },
                "note": {
                    "type": "string",
                    "description": "Personalised connection note (≤300 chars). Blank = no note.",
                    "default": "",
                },
            },
            "required": ["profile_url"],
        }

    @property
    def requires_approval(self) -> bool:
        return True

    def run(self, inputs: dict[str, Any]) -> str:
        url = inputs["profile_url"].strip()
        note = inputs.get("note", "").strip()
        if len(note) > 300:
            raise ToolError(f"Note too long ({len(note)} chars). LinkedIn limit is 300.")
        if "linkedin.com/in/" not in url:
            raise ToolError(f"Not a LinkedIn profile URL: {url}")

        cookie = self._cfg.linkedin.session_cookie

        with _session(cookie) as page:
            page.goto(url, timeout=20_000, wait_until="domcontentloaded")
            _pause()

            # Find and click Connect button
            connect_btn = page.locator(
                "button[aria-label*='Connect'], "
                "button:has-text('Connect')"
            ).first
            if not connect_btn.is_visible(timeout=5_000):
                raise ToolError(
                    "Connect button not found. The person may already be a connection, "
                    "or the profile requires a different approach."
                )
            connect_btn.click()
            _pause()

            if note:
                # Click "Add a note"
                add_note_btn = page.locator("button[aria-label='Add a note']").first
                if add_note_btn.is_visible(timeout=3_000):
                    add_note_btn.click()
                    _pause()
                    note_field = page.locator("textarea#custom-message").first
                    note_field.wait_for(timeout=5_000)
                    note_field.fill(note)
                    _pause()

            # Send the request
            send_btn = page.locator(
                "button[aria-label='Send now'], "
                "button[aria-label='Send invitation']"
            ).first
            send_btn.wait_for(timeout=5_000)
            send_btn.click()
            _pause(2.0, 4.0)

        logger.info("linkedin_connect: sent request to %s", url)
        return f"Connection request sent to {url}" + (f" with note: '{note[:60]}...'" if len(note) > 60 else f" with note: '{note}'" if note else ".")


# ---------------------------------------------------------------------------
# Direct messenger
# ---------------------------------------------------------------------------

class LinkedInMessageTool(BaseTool):
    """Send a direct message to a LinkedIn connection. Requires approval."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "linkedin_message"

    @property
    def description(self) -> str:
        return (
            "Send a direct message to an existing LinkedIn connection via their profile URL. "
            "Always requires approval before sending."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "profile_url": {
                    "type": "string",
                    "description": "LinkedIn profile URL of the connection to message.",
                },
                "message": {
                    "type": "string",
                    "description": "The message text.",
                },
            },
            "required": ["profile_url", "message"],
        }

    @property
    def requires_approval(self) -> bool:
        return True

    def run(self, inputs: dict[str, Any]) -> str:
        url = inputs["profile_url"].strip()
        message = inputs["message"].strip()
        if not message:
            raise ToolError("Message text cannot be empty.")
        if "linkedin.com/in/" not in url:
            raise ToolError(f"Not a LinkedIn profile URL: {url}")

        cookie = self._cfg.linkedin.session_cookie

        with _session(cookie) as page:
            page.goto(url, timeout=20_000, wait_until="domcontentloaded")
            _pause()

            # Click Message button on the profile
            msg_btn = page.locator(
                "button[aria-label*='Message'], "
                "button:has-text('Message')"
            ).first
            if not msg_btn.is_visible(timeout=5_000):
                raise ToolError(
                    "Message button not found. The person may not be a connection yet."
                )
            msg_btn.click()
            _pause()

            # Type in the message compose box
            msg_box = page.locator(
                "div.msg-form__contenteditable, "
                "div[data-placeholder='Write a message…']"
            ).first
            msg_box.wait_for(timeout=8_000)
            msg_box.click()
            msg_box.type(message, delay=30)
            _pause()

            # Send
            send_btn = page.locator(
                "button.msg-form__send-button, "
                "button[aria-label='Send']"
            ).first
            send_btn.wait_for(timeout=5_000)
            send_btn.click()
            _pause(1.5, 3.0)

        logger.info("linkedin_message: messaged %s", url)
        return f"Message sent to {url}."
