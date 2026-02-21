"""Tests for agent/security.py"""
from agent.security import check_path_traversal, redact_secrets, sanitise_input


def test_sanitise_strips_null():
    assert "\x00" not in sanitise_input("hello\x00world")


def test_sanitise_truncates():
    long_text = "a" * 5000
    assert len(sanitise_input(long_text)) == 4000


def test_sanitise_returns_stripped():
    assert sanitise_input("  hello  ") == "hello"


def test_redact_anthropic_key():
    text = "key is sk-ant-api03-ABCDEFabcdef12345678"
    assert "[REDACTED]" in redact_secrets(text)
    assert "sk-ant" not in redact_secrets(text)


def test_redact_slack_token():
    text = "token=xoxp-REDACTED-TEST-TOKEN"
    assert "[REDACTED]" in redact_secrets(text)


def test_path_traversal_detected():
    assert check_path_traversal("../../etc/passwd") is True
    assert check_path_traversal("~/secret") is True


def test_safe_path():
    assert check_path_traversal("/Users/samlino/Samlino/project/file.py") is False
