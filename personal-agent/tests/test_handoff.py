"""Tests for agent/handoff.py"""
from agent.handoff import build_claude_code_handoff, find_relevant_plan_files


def test_find_relevant_plan_files(tmp_path):
    (tmp_path / "tasks" / "pending").mkdir(parents=True)
    (tmp_path / "tasks" / "pending" / "TASK_API_LOGIN_FIX.md").write_text("fix login flow", encoding="utf-8")
    (tmp_path / "tasks" / "pending" / "TASK_SEO.md").write_text("seo improvements", encoding="utf-8")

    matches = find_relevant_plan_files(tmp_path, "Please fix API login issues", limit=3)
    assert any("TASK_API_LOGIN_FIX.md" in m for m in matches)


def test_build_handoff_payload(tmp_path):
    (tmp_path / "tasks" / "pending").mkdir(parents=True)
    (tmp_path / "tasks" / "pending" / "TASK_DEPLOY.md").write_text("deploy plan", encoding="utf-8")

    handoff = build_claude_code_handoff(
        project_root=tmp_path,
        ticket_id="IAN-000123",
        request_text="Deploy and fix API issues",
    )
    assert handoff.handoff_target == "claude_code"
    assert handoff.ticket_id == "IAN-000123"
    assert isinstance(handoff.linked_plan_files, list)

