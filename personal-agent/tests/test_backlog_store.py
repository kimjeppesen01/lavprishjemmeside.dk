"""Tests for memory/backlog.py"""
from memory.backlog import BacklogStore
from memory.db import get_connection, migrate


def test_create_ticket(tmp_path):
    db_path = tmp_path / "test.db"
    migrate(db_path)
    backlog = BacklogStore(db_path)

    ticket = backlog.create_ticket(
        title="Out-of-scope request: test",
        requester="U123",
        channel="C123",
        summary="Please do something unsupported",
        requested_outcome="Have this done",
        impact="medium",
        handoff_target="backlog_triage",
        intent="out_of_scope",
    )

    assert ticket.ticket_id.startswith("IAN-")
    assert ticket.intent == "out_of_scope"
    assert ticket.handoff_target == "backlog_triage"

    with get_connection(db_path) as conn:
        row = conn.execute(
            "SELECT ticket_id, title, intent, handoff_payload, linked_plan_files FROM backlog_requests WHERE ticket_id = ?",
            (ticket.ticket_id,),
        ).fetchone()
    assert row is not None
    assert row["intent"] == "out_of_scope"
    assert row["handoff_payload"] in ("", None)


def test_update_handoff_metadata(tmp_path):
    db_path = tmp_path / "test.db"
    migrate(db_path)
    backlog = BacklogStore(db_path)

    ticket = backlog.create_ticket(
        title="Dev handoff",
        requester="U123",
        channel="C123",
        summary="Implement login fix",
        requested_outcome="Stable login",
        impact="high",
        handoff_target="claude_code",
        intent="dev_handoff",
    )
    backlog.update_handoff_metadata(
        ticket_id=ticket.ticket_id,
        handoff_payload='{"ticket_id":"%s"}' % ticket.ticket_id,
        linked_plan_files=["tasks/pending/TASK_API_LOGIN_FIX.md"],
    )

    with get_connection(db_path) as conn:
        row = conn.execute(
            "SELECT handoff_payload, linked_plan_files FROM backlog_requests WHERE ticket_id = ?",
            (ticket.ticket_id,),
        ).fetchone()
    assert row is not None
    assert ticket.ticket_id in row["handoff_payload"]
    assert "TASK_API_LOGIN_FIX.md" in row["linked_plan_files"]
