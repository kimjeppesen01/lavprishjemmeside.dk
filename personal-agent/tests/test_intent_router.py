"""Tests for agent/intent_router.py"""
from agent.intent_router import (
    IntentType,
    allowed_tools_for_intent,
    classify_intent,
)


def test_dev_handoff_detected():
    d = classify_intent("Please implement this API route and deploy it")
    assert d.intent == IntentType.DEV_HANDOFF
    assert d.confidence >= 0.9


def test_status_lookup_detected():
    d = classify_intent("What is the current status and uptime?")
    assert d.intent == IntentType.STATUS_LOOKUP
    assert d.in_scope is True


def test_runbook_guidance_detected():
    d = classify_intent("Can you give me a step by step runbook?")
    assert d.intent == IntentType.RUNBOOK_GUIDANCE
    assert d.in_scope is True


def test_out_of_scope_when_no_match():
    d = classify_intent("Write me a poem about coffee beans")
    assert d.intent == IntentType.OUT_OF_SCOPE
    assert d.in_scope is False


def test_allowed_tools_restricted():
    tools = allowed_tools_for_intent(IntentType.REQUEST_CAPTURE)
    assert tools == frozenset()

