"""
agent/persona_router.py — Pure Python pre-classifier for persona selection (v1.1).

Two workflow personas layered on top of model selection:
  - BRAINSTORMER: idea refinement through multi-turn dialogue (Haiku model)
  - PLANNER: implementation plan design with full context (Sonnet model)
  - GENERAL: existing IAN general-purpose handling (unchanged)

DESIGN RULE: Pure function — no API calls, no DB access.
State continuity is handled by the caller (via session_metadata from history.py).
"""
from __future__ import annotations

from enum import Enum

# Terminal states where a workflow is complete and new routing can begin
_BRAINSTORMER_TERMINAL_STATES = frozenset({"TICKET_CREATED"})
_PLANNER_TERMINAL_STATES = frozenset({"PLAN_CREATED"})

_BRAINSTORMER_KEYWORDS: frozenset[str] = frozenset(
    {
        "idea",
        "brainstorm",
        "concept",
        "thinking about",
        "what if",
        "explore",
        "could we",
        "imagine",
        "feature idea",
        "new feature",
        "wild idea",
        "what about",
        "consider",
        "how about",
        "i want to",
        "i'm thinking",
    }
)

_PLANNER_KEYWORDS: frozenset[str] = frozenset(
    {
        "plan",
        "blueprint",
        "spec",
        "specification",
        "implementation plan",
        "design plan",
        "build plan",
        "how to build",
        "plan this",
        "plan for",
        "plan out",
        "technical design",
        "architect",
    }
)


class Persona(str, Enum):
    BRAINSTORMER = "brainstormer"
    PLANNER = "planner"
    GENERAL = "general"


def select_persona(text: str, session_metadata: dict | None = None) -> tuple[Persona, str]:
    """
    Return (persona, reason) for the given message text and session state.

    Priority order:
      1. Active Brainstormer session (not terminal) → BRAINSTORMER (continuity)
      2. Active Planner session (not terminal) → PLANNER (continuity)
      3. Explicit '!brainstorm' prefix → BRAINSTORMER
      4. Explicit '!plan' prefix → PLANNER
      5. Brainstormer keyword match → BRAINSTORMER
      6. Planner keyword match → PLANNER
      7. Default → GENERAL
    """
    meta = session_metadata or {}
    stripped = text.strip()
    lower = stripped.lower()

    # Session continuity — maintain active persona until terminal state
    # Normalize: JSON round-trip may give persona as string "planner" / "brainstormer"
    active_persona = meta.get("persona")
    if active_persona in (Persona.BRAINSTORMER, Persona.BRAINSTORMER.value):
        state = meta.get("brainstorm_state", "IDEATION")
        if state not in _BRAINSTORMER_TERMINAL_STATES:
            return Persona.BRAINSTORMER, f"session continuity (state={state})"

    if active_persona in (Persona.PLANNER, Persona.PLANNER.value):
        state = meta.get("planner_state", "PLANNING")
        # #region agent log
        try:
            import json, time
            with open("/Users/samlino/lavprishjemmeside.dk/.cursor/debug-c616c9.log", "a") as _f:
                _f.write(json.dumps({"sessionId": "c616c9", "location": "persona_router.py:planner_continuity", "message": "planner continuity check", "data": {"state": state, "terminal_states": list(_PLANNER_TERMINAL_STATES), "returning_planner": state not in _PLANNER_TERMINAL_STATES}, "hypothesisId": "H4", "timestamp": int(time.time() * 1000)}) + "\n")
        except Exception:
            pass
        # #endregion
        if state not in _PLANNER_TERMINAL_STATES:
            return Persona.PLANNER, f"session continuity (state={state})"

    # Explicit prefix overrides
    if lower.startswith("!brainstorm"):
        return Persona.BRAINSTORMER, "explicit !brainstorm prefix"
    if lower.startswith("!plan"):
        return Persona.PLANNER, "explicit !plan prefix"

    # Keyword matching
    for kw in _BRAINSTORMER_KEYWORDS:
        if kw in lower:
            return Persona.BRAINSTORMER, f"brainstormer keyword: '{kw}'"

    for kw in _PLANNER_KEYWORDS:
        if kw in lower:
            return Persona.PLANNER, f"planner keyword: '{kw}'"

    # Fallback: short approval/choice reply → route to PLANNER so we don't hit intent gate
    # Handles empty session_meta so "option 2" / "approve" after Planner still goes to Planner
    import re as _re
    _normalized = _re.sub(r"\s+", " ", lower.strip())
    _short_approval = frozenset({"option 1", "option 2", "1", "2", "yes", "no", "first", "second", "approve"})
    if len(_normalized) <= 50 and (
        _normalized in _short_approval
        or _re.match(r"^option\s*[12]\s*$", _normalized)
        or "approve" in _normalized  # "i approve", "approved", "please approve"
    ):
        return Persona.PLANNER, "short approval/choice reply → Planner (avoids OUT_OF_SCOPE on empty meta)"

    return Persona.GENERAL, "no persona match — general handler"
