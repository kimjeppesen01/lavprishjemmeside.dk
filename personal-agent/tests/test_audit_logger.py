"""Tests for audit/logger.py"""
import json

from audit.logger import AuditLogger


def test_policy_decision_event_written(tmp_path):
    logger = AuditLogger(tmp_path)
    logger.policy_decision(
        intent="dev_handoff",
        confidence=0.99,
        policy_decision="dev_handoff_backlog_created",
        ticket_id="IAN-000111",
        model_used="none_policy_gate",
        reason="development keyword match",
    )

    files = list((tmp_path / "transcripts").glob("*.jsonl"))
    assert len(files) == 1
    line = files[0].read_text(encoding="utf-8").strip().splitlines()[-1]
    payload = json.loads(line)
    assert payload["event"] == "policy_decision"
    assert payload["intent"] == "dev_handoff"
    assert payload["ticket_id"] == "IAN-000111"
    assert payload["model_used"] == "none_policy_gate"

