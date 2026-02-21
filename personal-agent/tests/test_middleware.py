"""Tests for slack/middleware.py"""
import pytest
from slack.middleware import is_owner_message

OWNER = "U12345"


@pytest.mark.parametrize("message,expected", [
    ({"user": OWNER, "text": "hello"}, True),
    ({"user": "U99999", "text": "hello"}, False),
    ({"user": OWNER, "subtype": "bot_message"}, False),
    ({"user": OWNER, "subtype": "message_changed"}, False),
    ({"user": OWNER, "subtype": "message_deleted"}, False),
    ({"user": OWNER, "subtype": "channel_join"}, False),
    ({}, False),
    ({"subtype": "bot_message"}, False),
])
def test_owner_filter(message, expected):
    assert is_owner_message(message, OWNER) == expected


def test_empty_owner_raises():
    with pytest.raises(ValueError):
        is_owner_message({"user": OWNER}, "")
