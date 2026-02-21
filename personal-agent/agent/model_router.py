"""
agent/model_router.py — Pure Python pre-classifier for model selection.

DESIGN RULE: This is a pure function — no API calls, no imports from anthropic.
Routing is decided before any API call is made. This avoids the double-billing
trap where you pay Haiku to decide whether Sonnet is needed.

Selection logic (checked in order):
  1. '!sonnet' prefix in text → force Sonnet
  2. Keyword match against HEAVY_KEYWORDS → Sonnet
  3. Everything else → Haiku (default)
"""
from __future__ import annotations

# Keywords that signal complex reasoning where Sonnet earns its cost
HEAVY_KEYWORDS: frozenset[str] = frozenset(
    {
        "architecture",
        "refactor",
        "review this code",
        "code review",
        "security",
        "vulnerability",
        "audit",
        "debug",
        "production deploy",
        "breaking change",
        "migration",
        "performance",
        "optimize",
        "strategic",
        "multi-project",
        # v1.1: Planner persona triggers (always route to Sonnet)
        "plan",
        "blueprint",
        "spec",
        "specification",
        "implementation plan",
        "design plan",
        "build plan",
    }
)


def select_model(text: str, model_default: str, model_heavy: str) -> tuple[str, str]:
    """
    Return (model_id, reason) for the given message text.

    Args:
        text: The raw message text from Slack.
        model_default: Haiku model ID from config.
        model_heavy: Sonnet model ID from config.

    Returns:
        Tuple of (model_id, reason_string).
    """
    stripped = text.strip()

    # Explicit overrides — highest priority
    if stripped.lower().startswith("!sonnet") or stripped.lower().startswith("!plan"):
        return model_heavy, "explicit Sonnet/Planner override"
    if stripped.lower().startswith("!brainstorm"):
        return model_default, "explicit Brainstormer override (Haiku)"

    # Keyword match — case-insensitive substring search
    lower = stripped.lower()
    for keyword in HEAVY_KEYWORDS:
        if keyword in lower:
            return model_heavy, f"keyword match: '{keyword}'"

    return model_default, "default (haiku)"
