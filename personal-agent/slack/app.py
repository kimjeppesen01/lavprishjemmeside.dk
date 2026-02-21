"""
slack/app.py — Slack layer entry point (polling-based, dual user-account).

Two real Slack user accounts are used:
  - Haiku account (xoxp-...): posts routine replies (claude-haiku-4-5-20251001)
  - Sonnet account (xoxp-...): posts complex replies (claude-sonnet-4-6)

The model router runs BEFORE any API call. Its output determines which
user account posts the reply — no double-billing.

Architecture:
  SlackPoller polls conversations.history every N seconds
      → is_owner_message() filter (middleware.py)
      → handle_message() (handlers.py)
          → model_router.select_model() [pure Python, no API call]
          → ClaudeClient.chat(model=selected)
          → post via haiku_client or sonnet_client
"""
from __future__ import annotations

import logging
import threading

from slack_sdk import WebClient

from slack.middleware import is_client_message

from agent.config import Config
from agent.scheduler import AgentScheduler
from audit.logger import AuditLogger
from slack.handlers import make_handler
from slack.poller import SlackPoller

logger = logging.getLogger(__name__)


def start(cfg: Config, audit: AuditLogger | None = None) -> None:
    """
    Create the two WebClient instances, start the scheduler, then the polling loop (blocking).
    """
    haiku_client = WebClient(token=cfg.slack.user_token_haiku)
    sonnet_client = WebClient(token=cfg.slack.user_token_sonnet)

    _verify_token(haiku_client, "Haiku")
    _verify_token(sonnet_client, "Sonnet")

    logger.info(
        "Slack clients ready | channel=%s | poll=%ds",
        cfg.slack.control_channel_id,
        cfg.slack.poll_interval_seconds,
    )

    # Start background scheduler (heartbeat + briefings)
    _audit = audit or AuditLogger(cfg.audit.log_path)
    scheduler = AgentScheduler(cfg, haiku_client, cfg.memory.db_path, _audit)
    scheduler.start()

    handler = make_handler(cfg, haiku_client, sonnet_client, _audit)

    # --- Client channel pollers (daemon threads, one per client) ---
    for channel_id in cfg.slack.client_channels:
        client_poller = SlackPoller(
            read_client=haiku_client,
            owner_user_id=cfg.slack.owner_user_id,
            channel_id=channel_id,
            handler=handler,
            poll_interval_seconds=cfg.slack.poll_interval_seconds,
            message_filter=is_client_message,
        )
        t = threading.Thread(
            target=client_poller.start,
            name=f"client-poller-{channel_id}",
            daemon=True,
        )
        t.start()
        logger.info("Client poller started | channel=%s", channel_id)

    # --- Control channel poller (main thread, blocking) ---
    poller = SlackPoller(
        read_client=haiku_client,
        owner_user_id=cfg.slack.owner_user_id,
        channel_id=cfg.slack.control_channel_id,
        handler=handler,
        poll_interval_seconds=cfg.slack.poll_interval_seconds,
    )
    try:
        poller.start()
    finally:
        scheduler.stop()


def _verify_token(client: WebClient, label: str) -> None:
    """Call auth.test to confirm the token is valid. Raises on failure."""
    from slack_sdk.errors import SlackApiError
    try:
        resp = client.auth_test()
        logger.info(
            "Token verified | account=%s | user=%s | team=%s",
            label,
            resp.get("user"),
            resp.get("team"),
        )
    except SlackApiError as exc:
        raise RuntimeError(
            f"[slack] {label} token failed auth.test: {exc.response.get('error')}. "
            f"Check SLACK_USER_TOKEN_{label.upper()} in .env"
        ) from exc
