"""
agent/intent_router.py — Deterministic fixed-intent classifier for IAN.

Phase 2 guardrail goals:
  - Map each message to a fixed intent enum
  - Enforce a confidence threshold
  - Identify development requests for hard Claude Code handoff
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class IntentType(str, Enum):
    FAQ_ANSWER = "faq_answer"
    STATUS_LOOKUP = "status_lookup"
    RUNBOOK_GUIDANCE = "runbook_guidance"
    LIGHT_TRIAGE = "light_triage"
    REQUEST_CAPTURE = "request_capture"
    DEV_HANDOFF = "dev_handoff"
    NEEDS_CLARIFICATION = "needs_clarification"
    OUT_OF_SCOPE = "out_of_scope"


ALLOWED_IN_SCOPE_INTENTS: frozenset[IntentType] = frozenset(
    {
        IntentType.FAQ_ANSWER,
        IntentType.STATUS_LOOKUP,
        IntentType.RUNBOOK_GUIDANCE,
        IntentType.LIGHT_TRIAGE,
        IntentType.REQUEST_CAPTURE,
    }
)

MIN_CONFIDENCE_DEFAULT = 0.60

_DEV_KEYWORDS = frozenset(
    {
        "implement",
        "fix bug",
        "deploy",
        "migration",
        "schema",
        "refactor",
        "write code",
        "build feature",
        "create endpoint",
        "api route",
        "pull request",
        "merge branch",
        "release",
        "rollback",
        "restart api",
    }
)

_INTENT_KEYWORDS: dict[IntentType, frozenset[str]] = {
    IntentType.FAQ_ANSWER: frozenset(
        {
            "what is",
            "how does",
            "can i",
            "faq",
            "feature",
            "price",
            "pricing",
            "billing",
            "account",
        }
    ),
    IntentType.STATUS_LOOKUP: frozenset(
        {
            "status",
            "uptime",
            "is it down",
            "progress",
            "update on",
            "where are we",
            "eta",
            "health",
        }
    ),
    IntentType.RUNBOOK_GUIDANCE: frozenset(
        {
            "runbook",
            "checklist",
            "step by step",
            "how to",
            "guide me",
            "procedure",
            "playbook",
        }
    ),
    IntentType.LIGHT_TRIAGE: frozenset(
        {
            "not working",
            "broken",
            "issue",
            "problem",
            "error",
            "fails",
            "failed",
            "cannot",
            "can't",
        }
    ),
    IntentType.REQUEST_CAPTURE: frozenset(
        {
            "feature request",
            "request",
            "would like",
            "please add",
            "could you add",
            "suggestion",
        }
    ),
}


@dataclass(frozen=True)
class IntentDecision:
    intent: IntentType
    confidence: float
    reason: str

    @property
    def in_scope(self) -> bool:
        return self.intent in ALLOWED_IN_SCOPE_INTENTS

    @property
    def is_dev_handoff(self) -> bool:
        return self.intent == IntentType.DEV_HANDOFF

    @property
    def needs_clarification(self) -> bool:
        return self.intent == IntentType.NEEDS_CLARIFICATION


def _count_matches(text: str, keywords: frozenset[str]) -> int:
    return sum(1 for kw in keywords if kw in text)


def classify_intent(text: str, min_confidence: float = MIN_CONFIDENCE_DEFAULT) -> IntentDecision:
    """
    Deterministically classify a message into IAN's fixed intent set.
    """
    lower = text.strip().lower()
    if not lower:
        return IntentDecision(
            intent=IntentType.NEEDS_CLARIFICATION,
            confidence=0.0,
            reason="empty message",
        )

    # Development requests are always hard handoff.
    if any(keyword in lower for keyword in _DEV_KEYWORDS):
        return IntentDecision(
            intent=IntentType.DEV_HANDOFF,
            confidence=0.99,
            reason="development keyword match",
        )

    scored: list[tuple[IntentType, int]] = []
    for intent, keywords in _INTENT_KEYWORDS.items():
        scored.append((intent, _count_matches(lower, keywords)))

    scored.sort(key=lambda item: item[1], reverse=True)
    best_intent, best_score = scored[0]
    second_score = scored[1][1] if len(scored) > 1 else 0

    if best_score <= 0:
        return IntentDecision(
            intent=IntentType.OUT_OF_SCOPE,
            confidence=0.25,
            reason="no intent keyword match",
        )

    # Ambiguous tie -> clarification.
    if best_score == second_score:
        return IntentDecision(
            intent=IntentType.NEEDS_CLARIFICATION,
            confidence=0.45,
            reason="ambiguous intent tie",
        )

    confidence = min(0.95, 0.45 + (0.20 * best_score))
    if confidence < min_confidence:
        return IntentDecision(
            intent=IntentType.NEEDS_CLARIFICATION,
            confidence=confidence,
            reason="confidence below threshold",
        )

    return IntentDecision(
        intent=best_intent,
        confidence=confidence,
        reason=f"keyword score={best_score}",
    )


def allowed_tools_for_intent(intent: IntentType) -> frozenset[str]:
    """
    Return the allowed tool names for a given intent.
    Tool access is intentionally narrow in fixed-environment mode.
    """
    if intent == IntentType.STATUS_LOOKUP:
        return frozenset({"filesystem_read", "filesystem_list", "web_search"})
    if intent in {IntentType.FAQ_ANSWER, IntentType.RUNBOOK_GUIDANCE, IntentType.LIGHT_TRIAGE}:
        return frozenset({"filesystem_read", "web_search"})
    if intent == IntentType.REQUEST_CAPTURE:
        return frozenset()
    return frozenset()

