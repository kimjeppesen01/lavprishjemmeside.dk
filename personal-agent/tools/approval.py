"""
tools/approval.py — Slack interactive approval gate for dangerous tool calls.

Flow:
  1. Agent wants to run a tool with requires_approval=True
  2. ApprovalGate.request() posts a Block Kit message with Approve/Reject buttons
  3. Agent polls for the owner's button click (via conversations.history)
  4. If Approve → tool runs; if Reject or timeout → tool blocked

The Slack button action sends a message back to the channel with a
recognisable prefix ("✅ Approved" / "❌ Rejected") since we're using
user tokens (not a bot webhook). The poller detects this pattern.

Timeout: APPROVAL_TIMEOUT_SECONDS (default 120s). After timeout, the
request is automatically rejected and the agent notifies the owner.
"""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

logger = logging.getLogger(__name__)

APPROVE_PREFIX = "✅ approve"
REJECT_PREFIX = "❌ reject"


class ApprovalGate:
    def __init__(
        self,
        client: WebClient,
        owner_user_id: str,
        channel_id: str,
        timeout_seconds: int = 120,
        poll_interval: int = 3,
    ) -> None:
        self._client = client
        self._owner_user_id = owner_user_id
        self._channel_id = channel_id
        self._timeout = timeout_seconds
        self._poll_interval = poll_interval

    def request(self, tool_name: str, inputs: dict[str, Any]) -> bool:
        """
        Post an approval request and block until approved, rejected, or timed out.

        Args:
            tool_name: Name of the tool requesting approval.
            inputs: The tool's input dict (shown to the owner for context).

        Returns:
            True if approved, False if rejected or timed out.
        """
        request_id = str(uuid.uuid4())[:8]
        inputs_preview = str(inputs)[:300]

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f":warning: *Tool approval required*\n"
                        f"*Tool:* `{tool_name}`\n"
                        f"*Inputs:* ```{inputs_preview}```\n"
                        f"*Request ID:* `{request_id}`"
                    ),
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"Reply with:\n"
                        f"• `{APPROVE_PREFIX} {request_id}` to allow\n"
                        f"• `{REJECT_PREFIX} {request_id}` to deny\n"
                        f"_Timeout in {self._timeout}s_"
                    ),
                },
            },
        ]

        try:
            resp = self._client.chat_postMessage(
                channel=self._channel_id,
                blocks=blocks,
                text=f"Approval required for {tool_name}",
            )
            sent_ts = resp["ts"]
        except SlackApiError:
            logger.exception("approval: failed to post request")
            return False

        logger.info("approval.request tool=%s id=%s timeout=%ds", tool_name, request_id, self._timeout)

        # Poll for the owner's response
        deadline = time.time() + self._timeout
        last_checked_ts = sent_ts

        while time.time() < deadline:
            time.sleep(self._poll_interval)
            try:
                resp = self._client.conversations_history(
                    channel=self._channel_id,
                    oldest=last_checked_ts,
                    limit=10,
                    inclusive=False,
                )
                messages = resp.get("messages", [])
                for msg in reversed(messages):
                    if msg.get("user") != self._owner_user_id:
                        continue
                    text = msg.get("text", "").lower().strip()
                    if text.startswith(APPROVE_PREFIX) and request_id in text:
                        logger.info("approval.granted tool=%s id=%s", tool_name, request_id)
                        self._client.chat_postMessage(
                            channel=self._channel_id,
                            text=f":white_check_mark: Approved — running `{tool_name}`",
                        )
                        return True
                    if text.startswith(REJECT_PREFIX) and request_id in text:
                        logger.info("approval.rejected tool=%s id=%s", tool_name, request_id)
                        self._client.chat_postMessage(
                            channel=self._channel_id,
                            text=f":x: Rejected — `{tool_name}` was not run.",
                        )
                        return False
                    if messages:
                        last_checked_ts = messages[0].get("ts", last_checked_ts)
            except SlackApiError:
                logger.exception("approval: polling error")

        # Timed out
        logger.warning("approval.timeout tool=%s id=%s", tool_name, request_id)
        try:
            self._client.chat_postMessage(
                channel=self._channel_id,
                text=f":timer_clock: Approval timed out after {self._timeout}s — `{tool_name}` was not run.",
            )
        except SlackApiError:
            pass
        return False
