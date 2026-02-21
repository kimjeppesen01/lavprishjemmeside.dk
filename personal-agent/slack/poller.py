"""
slack/poller.py — Polling loop that replaces Socket Mode.

Since we use real Slack user accounts (xoxp- tokens) instead of a bot,
Socket Mode is unavailable. This module polls conversations.history on a
fixed interval and dispatches new owner messages to the handler.

Polling strategy:
  - Track the timestamp of the last seen message (Slack ts = unix epoch string)
  - On each tick, fetch messages newer than last_ts with oldest=last_ts
  - Filter to owner-only messages via middleware.is_owner_message
  - Pass qualifying messages to the registered handler function

Why not webhooks or RTM?
  - Webhooks require a public URL (not suitable for a local Mac agent)
  - RTM API is deprecated since 2021
  - Polling at 5s intervals is sufficient for a personal agent and adds zero
    infrastructure requirements
"""
from __future__ import annotations

import logging
import time
from typing import Callable

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from slack.middleware import is_owner_message

logger = logging.getLogger(__name__)

# Type alias for the handler function
MessageHandler = Callable[[dict, str], None]  # (message_dict, reply_model) -> None

MessageFilter = Callable[[dict, str], bool]


class SlackPoller:
    """
    Polls a Slack channel for new messages and dispatches them to a handler.

    Args:
        read_client: WebClient used to read channel history (either token works).
        owner_user_id: Only messages from this user ID are dispatched.
        channel_id: The Slack channel to monitor.
        poll_interval_seconds: Seconds between polls (default: 5).
        handler: Callable invoked with each qualifying message dict.
    """

    def __init__(
        self,
        read_client: WebClient,
        owner_user_id: str,
        channel_id: str,
        handler: MessageHandler,
        poll_interval_seconds: int = 5,
        message_filter: MessageFilter = is_owner_message,
    ) -> None:
        self._client = read_client
        self._owner_user_id = owner_user_id
        self._channel_id = channel_id
        self._handler = handler
        self._interval = poll_interval_seconds
        self._message_filter = message_filter
        self._running = False

    def start(self) -> None:
        """Start the blocking poll loop. Call this on a dedicated thread or as main."""
        self._running = True
        # Initialise cursor to now so we only process messages arriving after startup
        last_ts = str(time.time())
        logger.info(
            "Poller started | channel=%s | interval=%ds",
            self._channel_id,
            self._interval,
        )

        while self._running:
            time.sleep(self._interval)
            try:
                last_ts = self._poll(last_ts)
            except SlackApiError as exc:
                if exc.response.get("error") == "ratelimited":
                    retry_after = int(exc.response.headers.get("Retry-After", 60))
                    logger.warning("Rate limited — sleeping %ds", retry_after)
                    time.sleep(retry_after)
                else:
                    logger.error("Slack API error: %s", exc.response.get("error"))
            except Exception:
                logger.exception("Unexpected error in poll loop — continuing")

    def stop(self) -> None:
        """Signal the poll loop to exit after the current sleep."""
        self._running = False

    def _poll(self, oldest_ts: str) -> str:
        """
        Fetch messages newer than oldest_ts, dispatch qualifying ones.

        Returns the timestamp of the newest message seen (or oldest_ts if none).
        """
        resp = self._client.conversations_history(
            channel=self._channel_id,
            oldest=oldest_ts,
            limit=20,
            inclusive=False,  # exclude the message at oldest_ts itself
        )

        messages: list[dict] = resp.get("messages", [])
        if not messages:
            return oldest_ts

        # Slack returns newest first — reverse to process chronologically
        messages = list(reversed(messages))
        new_last_ts = oldest_ts

        for msg in messages:
            msg_ts = msg.get("ts", oldest_ts)
            if msg_ts > new_last_ts:
                new_last_ts = msg_ts

            if self._message_filter(msg, self._owner_user_id):
                logger.debug("Dispatching message ts=%s", msg_ts)
                try:
                    self._handler(msg)
                except Exception:
                    logger.exception("Handler raised on message ts=%s", msg_ts)

        return new_last_ts
