"""
slack/middleware.py — Owner-only message filter for the polling loop.

No longer a slack-bolt middleware (we don't use bolt anymore). This is a
pure Python predicate applied to each polled Slack message dict.

Design rule: This file must never import from agent/ or memory/. It is a
pure Slack-layer guard with zero business logic.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def is_owner_message(message: dict, owner_user_id: str) -> bool:
    """
    Return True only if the message was sent by the owner.

    Handles:
      - Regular channel messages: message['user']
      - Thread replies: message['user'] (same field)
      - Bot messages (subtype='bot_message'): always rejected
      - Edited/deleted messages: always rejected

    Args:
        message: A Slack message dict from conversations.history.
        owner_user_id: The configured SLACK_OWNER_USER_ID.

    Returns:
        True if this message should be processed, False to silently drop.
    """
    if not owner_user_id:
        raise ValueError(
            "owner_user_id must be set — this is the security perimeter. "
            "Set SLACK_OWNER_USER_ID in .env"
        )

    # Filter out system/bot messages
    subtype = message.get("subtype", "")
    if subtype in ("bot_message", "message_changed", "message_deleted", "channel_join"):
        return False

    user_id = message.get("user", "")
    if user_id == owner_user_id:
        return True

    # Silent drop — don't log the user ID to avoid leaking info
    logger.debug("Dropped non-owner message (subtype=%s)", subtype or "none")
    return False


def is_client_message(message: dict, owner_user_id: str) -> bool:
    """
    Return True for messages IAN should respond to in client channels.
    Drops: bot/system subtypes + messages FROM the owner
    (owner can talk directly to clients without IAN interrupting).
    Accepts: any other real user message.
    """
    if not owner_user_id:
        raise ValueError("owner_user_id must be set. Set SLACK_OWNER_USER_ID in .env")

    subtype = message.get("subtype", "")
    if subtype in ("bot_message", "message_changed", "message_deleted", "channel_join"):
        return False

    user_id = message.get("user", "")
    if user_id == owner_user_id:
        logger.debug("Dropped owner message in client channel (owner direct chat)")
        return False

    if user_id:
        return True

    logger.debug("Dropped message with no user field (subtype=%s)", subtype or "none")
    return False
