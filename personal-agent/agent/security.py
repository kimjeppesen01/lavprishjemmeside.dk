"""
agent/security.py — Input sanitisation and security checks.

Functions used at message ingestion time to prevent:
  - Prompt injection via crafted Slack messages
  - Path traversal in tool inputs
  - Accidentally leaking secrets in logged output
"""
from __future__ import annotations

import re

# Patterns that suggest prompt injection attempts
_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(r"ignore (all |previous )?instructions", re.I),
    re.compile(r"you are now", re.I),
    re.compile(r"system prompt", re.I),
    re.compile(r"<\|.*?\|>"),          # token injection markers
    re.compile(r"\[INST\]|\[/INST\]"), # LLaMA instruction tags
]

# Patterns that look like secrets — redact from any logged strings
_SECRET_PATTERNS: list[re.Pattern] = [
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{10,}"),   # Anthropic API keys
    re.compile(r"xoxp-[0-9]+-[0-9]+-[0-9]+-[a-f0-9]+"),  # Slack user tokens
    re.compile(r"xoxb-[0-9]+-[A-Za-z0-9]+"),              # Slack bot tokens
    re.compile(r"ghp_[A-Za-z0-9]{36}"),                   # GitHub PATs
]


def sanitise_input(text: str) -> str:
    """
    Light sanitisation of user input before passing to Claude.

    - Strips null bytes
    - Trims to 4000 chars (prevents huge context stuffing)
    - Does NOT block injection patterns — we log warnings but still process,
      since Claude itself is robust to these and blocking would be frustrating.
    """
    text = text.replace("\x00", "").strip()
    text = text[:4000]

    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            import logging
            logging.getLogger(__name__).warning(
                "security: possible injection pattern detected: %s",
                pattern.pattern,
            )

    return text


def redact_secrets(text: str) -> str:
    """Replace any detected secret patterns with [REDACTED] for safe logging."""
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub("[REDACTED]", text)
    return text


def check_path_traversal(path_str: str) -> bool:
    """Return True if the path contains traversal sequences (.., %2e, etc.)."""
    decoded = path_str.replace("%2e", ".").replace("%2E", ".")
    return ".." in decoded or decoded.startswith("~")


def rotation_reminder_days(created_at_iso: str, threshold_days: int = 90) -> int | None:
    """
    Return days until secret rotation is due, or None if not yet due.

    Args:
        created_at_iso: ISO date string when the secret was created/last rotated.
        threshold_days: Days between mandatory rotations.
    """
    from datetime import datetime, timezone
    try:
        created = datetime.fromisoformat(created_at_iso).replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        age_days = (now - created).days
        days_remaining = threshold_days - age_days
        return days_remaining if days_remaining <= 14 else None
    except ValueError:
        return None
