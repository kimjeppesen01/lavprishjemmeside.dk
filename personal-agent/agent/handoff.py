"""
agent/handoff.py — Claude Code handoff payload builder for dev requests.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ClaudeCodeHandoff:
    handoff_target: str
    ticket_id: str
    request_summary: str
    requested_outcome: str
    linked_plan_files: list[str]
    execution_policy: str


def _tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-z0-9]{3,}", text.lower())
    return [t for t in tokens if t not in {"the", "and", "for", "with", "from", "this", "that", "are"}]


def find_relevant_plan_files(project_root: Path, request_text: str, limit: int = 3) -> list[str]:
    """
    Return top relevant files from tasks/**/*.md using basic keyword overlap.
    """
    tasks_root = project_root / "tasks"
    if not tasks_root.exists():
        return []

    request_tokens = set(_tokenize(request_text))
    scored: list[tuple[int, str]] = []
    for path in tasks_root.rglob("*.md"):
        rel = str(path.relative_to(project_root))
        haystack = (rel + " " + path.stem.replace("_", " ").replace("-", " ")).lower()
        score = sum(1 for token in request_tokens if token in haystack)
        if score > 0:
            scored.append((score, rel))

    scored.sort(key=lambda item: item[0], reverse=True)
    seen: set[str] = set()
    results: list[str] = []
    for _, rel in scored:
        if rel in seen:
            continue
        results.append(rel)
        seen.add(rel)
        if len(results) >= limit:
            break
    return results


def build_claude_code_handoff(
    *,
    project_root: Path,
    ticket_id: str,
    request_text: str,
) -> ClaudeCodeHandoff:
    linked = find_relevant_plan_files(project_root, request_text, limit=3)
    summary = request_text.strip()[:500] or "(no summary)"
    return ClaudeCodeHandoff(
        handoff_target="claude_code",
        ticket_id=ticket_id,
        request_summary=summary,
        requested_outcome=summary,
        linked_plan_files=linked,
        execution_policy="Development tasks are executed in Claude Code only.",
    )

