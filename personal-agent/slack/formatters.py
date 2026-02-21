"""
slack/formatters.py — Slack Block Kit message formatters.

All outgoing messages should be formatted through this module so the
presentation layer stays separate from business logic.
"""
from __future__ import annotations

import platform
from datetime import datetime, timezone

from agent.config import Config


def format_status(cfg: Config) -> dict:
    """
    Build a Slack Block Kit status message.

    Returns a dict with 'blocks' key suitable for passing directly to say().
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f":robot_face: {cfg.agent.name} — Agent Status"},
        },
        {"type": "divider"},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": "*Status:*\n:green_circle: Online"},
                {"type": "mrkdwn", "text": f"*Time:*\n{now}"},
                {"type": "mrkdwn", "text": f"*Default model:*\n`{cfg.anthropic.model_default}`"},
                {"type": "mrkdwn", "text": f"*Heavy model:*\n`{cfg.anthropic.model_heavy}`"},
                {"type": "mrkdwn", "text": f"*Prompt cache:*\n{'enabled' if cfg.anthropic.prompt_cache_enabled else 'disabled'}"},
                {"type": "mrkdwn", "text": f"*Heartbeat:*\n{'model' if cfg.heartbeat.use_model else 'python ping'} every {cfg.heartbeat.interval_hours}h"},
            ],
        },
        {"type": "divider"},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Daily budget:*\n${cfg.budget.daily_limit_usd:.2f}"},
                {"type": "mrkdwn", "text": f"*Monthly budget:*\n${cfg.budget.monthly_limit_usd:.2f}"},
                {"type": "mrkdwn", "text": f"*Rate limit:*\n{cfg.rate.min_seconds_between_calls}s between calls"},
                {"type": "mrkdwn", "text": f"*OS:*\n{platform.system()} {platform.release()}"},
            ],
        },
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": "Use `!help` to see all commands."}
            ],
        },
    ]

    return {"blocks": blocks}


def format_error(title: str, detail: str) -> dict:
    """Format an error message with a red header."""
    return {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":red_circle: *{title}*\n{detail}",
                },
            }
        ]
    }


def format_text(text: str) -> dict:
    """Wrap plain text in a simple mrkdwn section block."""
    return {
        "blocks": [
            {"type": "section", "text": {"type": "mrkdwn", "text": text}}
        ]
    }
