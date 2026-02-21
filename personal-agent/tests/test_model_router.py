"""Tests for agent/model_router.py"""
import pytest
from agent.model_router import select_model

H = "claude-haiku-4-5-20251001"
S = "claude-sonnet-4-6"


@pytest.mark.parametrize("text,expected_model", [
    ("hello, how are you", H),
    ("what time is it in Copenhagen", H),
    ("summarise my emails", H),
    ("!sonnet explain this", S),
    ("!SONNET design a system", S),
    ("  !sonnet   ", S),
    ("can you review this code", S),
    ("do a security audit", S),
    ("architecture decision needed", S),
    ("help me refactor this module", S),
    ("I need a performance review", S),
    ("debug this production deploy", S),
])
def test_model_selection(text, expected_model):
    model, reason = select_model(text, H, S)
    assert model == expected_model, f"Text {text!r}: expected {expected_model}, got {model} ({reason})"


def test_sonnet_strips_prefix():
    """!sonnet prefix maps to heavy model regardless of keyword absence."""
    model, reason = select_model("!sonnet what is 2+2", H, S)
    assert model == S
    assert "override" in reason


def test_default_is_haiku():
    model, _ = select_model("", H, S)
    assert model == H
