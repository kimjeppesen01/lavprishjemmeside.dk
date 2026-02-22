"""agent/kanban_sync.py — Sync IAN tickets to website Kanban via REST API."""
from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class KanbanCard:
    remote_id: int
    title: str
    column_name: str


_ASSIGNED_MAP = {
    "planner": "planner",
    "brainstormer": "brainstormer",
    "claude_code": "human",
    "backlog_triage": "human",
    "human": "human",
}

_COLUMN_MAP = {
    "idea_brainstorm": "ideas",
    "plan_design": "plans",
    "out_of_scope": "ideas",
    "dev_handoff": "ideas",
    "request_capture": "ideas",
}


def sync_to_kanban(
    api_url: str,
    api_key: str,
    *,
    title: str,
    description: str = "",
    intent: str = "",
    handoff_target: str = "human",
    priority: str = "medium",
) -> KanbanCard | None:
    if not api_url or not api_key:
        return None
    try:
        resp = httpx.post(
            f"{api_url.rstrip('/')}/master/kanban",
            json={
                "title": title[:255],
                "description": description,
                "column_name": _COLUMN_MAP.get(intent, "ideas"),
                "priority": priority,
                "assigned_to": _ASSIGNED_MAP.get(handoff_target, "human"),
            },
            headers={"Content-Type": "application/json", "x-api-key": api_key},
            timeout=10,
        )
        resp.raise_for_status()
        remote_id = int(resp.json().get("id"))
        card = KanbanCard(remote_id=remote_id, title=title[:255], column_name=_COLUMN_MAP.get(intent, "ideas"))
        logger.info("kanban.synced remote_id=%d column=%s", card.remote_id, card.column_name)
        return card
    except Exception:
        logger.warning("kanban.sync_failed title=%s", title[:80], exc_info=True)
        return None
