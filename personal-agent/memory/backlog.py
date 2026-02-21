"""
memory/backlog.py — Structured backlog intake storage.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from memory.db import get_connection


@dataclass(frozen=True)
class BacklogTicket:
    ticket_id: str
    title: str
    requester: str
    channel: str
    summary: str
    requested_outcome: str
    impact: str
    handoff_target: str
    status: str
    intent: str
    handoff_payload: str
    linked_plan_files: list[str]


class BacklogStore:
    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path

    def create_ticket(
        self,
        *,
        title: str,
        requester: str,
        channel: str,
        summary: str,
        requested_outcome: str,
        impact: str,
        handoff_target: str,
        intent: str,
        status: str = "open",
        handoff_payload: str = "",
        linked_plan_files: list[str] | None = None,
    ) -> BacklogTicket:
        linked_plan_files = linked_plan_files or []
        with get_connection(self._db_path) as conn:
            cur = conn.execute(
                """
                INSERT INTO backlog_requests
                    (title, requester, channel, summary, requested_outcome, impact, handoff_target, status, intent, handoff_payload, linked_plan_files)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    title,
                    requester,
                    channel,
                    summary,
                    requested_outcome,
                    impact,
                    handoff_target,
                    status,
                    intent,
                    handoff_payload,
                    json.dumps(linked_plan_files, ensure_ascii=False),
                ),
            )
            row_id = int(cur.lastrowid)
            ticket_id = f"IAN-{row_id:06d}"
            conn.execute(
                "UPDATE backlog_requests SET ticket_id = ? WHERE id = ?",
                (ticket_id, row_id),
            )

        return BacklogTicket(
            ticket_id=ticket_id,
            title=title,
            requester=requester,
            channel=channel,
            summary=summary,
            requested_outcome=requested_outcome,
            impact=impact,
            handoff_target=handoff_target,
            status=status,
            intent=intent,
            handoff_payload=handoff_payload,
            linked_plan_files=linked_plan_files,
        )

    def update_handoff_metadata(
        self,
        *,
        ticket_id: str,
        handoff_payload: str,
        linked_plan_files: list[str],
    ) -> None:
        with get_connection(self._db_path) as conn:
            conn.execute(
                """
                UPDATE backlog_requests
                SET handoff_payload = ?, linked_plan_files = ?
                WHERE ticket_id = ?
                """,
                (
                    handoff_payload,
                    json.dumps(linked_plan_files, ensure_ascii=False),
                    ticket_id,
                ),
            )
