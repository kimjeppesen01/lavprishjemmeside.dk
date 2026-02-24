"""
agent/brainstormer.py — Brainstormer persona state machine helpers (v1.1).

The Brainstormer guides raw ideas through structured dialogue into actionable
Kanban tasks. It never accepts an idea as-is in the first message.

State machine:
  IDEATION → REFINEMENT → SYNTHESIS → APPROVED → TICKET_CREATED

State is persisted in session_metadata via memory/history.py.

Approval sentinel: Claude ends its reply with [BRAINSTORM:APPROVED] when
the user signals approval. The handler strips this before posting to Slack.
"""
from __future__ import annotations

import re
from pathlib import Path

APPROVAL_SENTINEL = "[BRAINSTORM:APPROVED]"

BRAINSTORM_STATES = [
    "IDEATION",
    "REFINEMENT",
    "SYNTHESIS",
    "APPROVED",
    "TICKET_CREATED",
]

# Words that signal the user approves / wants to proceed
_APPROVAL_SIGNALS = frozenset(
    {
        "yes",
        "approve",
        "approved",
        "looks good",
        "go ahead",
        "create it",
        "make it",
        "perfect",
        "great",
        "let's do it",
        "let's go",
        "do it",
        "create task",
        "create the task",
        "add to kanban",
    }
)

_WORKFLOW_DOC_PATH = (
    Path(__file__).parent.parent / "docs" / "BRAINSTORMER_WORKFLOW.md"
)


def _load_workflow_doc() -> str:
    try:
        return _WORKFLOW_DOC_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def build_system_prompt(
    state: str,
    raw_idea: str,
    refined_idea: str | None = None,
    approval_pending: bool = False,
) -> str:
    """
    Build a state-specific system prompt block for the Brainstormer persona.
    This is prepended to the IAN SOUL/USER context before calling Claude.

    approval_pending=True: user just said "yes" in SYNTHESIS — Claude must emit the
    sentinel in THIS reply, not a future one.
    """
    workflow_doc = _load_workflow_doc()

    # When approval is pending, override with a focused instruction that guarantees
    # the sentinel appears in the current reply — no ambiguity.
    if approval_pending and state == "SYNTHESIS":
        state_instruction = (
            "ACTION REQUIRED — the user has just approved the Task Definition.\n\n"
            "Write exactly 2 plain-language sentences:\n"
            "1. What was captured (reference the title from the Task Definition)\n"
            "2. What happens next (the Planner will design exactly how to build it)\n\n"
            "Then on a new line, write exactly: "
            f"{APPROVAL_SENTINEL}\n\n"
            "Do not add anything else. Do not repeat the Task Definition."
        )
    else:
        state_instruction = {
            "IDEATION": (
                "You are in the IDEATION state. The user has just shared a raw idea.\n"
                "Your job:\n"
                "1. Acknowledge the idea in 1 enthusiastic plain-language sentence\n"
                "2. Ask exactly 2-3 clarifying questions — business/user/value focused ONLY\n"
                "   (Who is it for? What problem does it solve? What would success look like?)\n"
                "3. NEVER mention technology, code, databases, or implementation\n"
                "4. NEVER suggest the idea is ready or talk about creating a task yet"
            ),
            "REFINEMENT": (
                "You are in the REFINEMENT state. The user has answered your questions.\n"
                "Your job:\n"
                "1. Summarise what you've learned in 2-3 plain-language sentences\n"
                "2. Suggest 1-2 improvements that increase impact or reduce scope\n"
                "3. Ask 1-2 follow-up questions about priority, timing, or business scope\n"
                "4. Still NO technology talk — stay outcome-focused\n"
                "5. Do NOT create a task yet"
            ),
            "SYNTHESIS": (
                "You are in the SYNTHESIS state. You have enough information.\n"
                "Present the Task Definition using this EXACT format:\n\n"
                "**TASK DEFINITION**\n\n"
                "**Title**: [concise, action-oriented, plain language]\n"
                "**The Problem**: [1-2 sentences — what's broken/missing and who feels it]\n"
                "**The Solution**: [the refined idea in plain language]\n"
                "**Who Benefits**: [specific users and how]\n"
                "**What Success Looks Like**: [measurable plain-language outcomes]\n"
                "**Estimated Effort**: Small / Medium / Large\n"
                "**Key Risks**: [1-2 things that could go wrong]\n\n"
                "End with:\n"
                "'Does this capture it correctly? Reply **yes** to approve and I'll create "
                "the task — or let me know what to adjust.'\n\n"
                "IMPORTANT: Do NOT emit [BRAINSTORM:APPROVED] in this reply. Wait for the "
                "user's explicit approval message first."
            ),
        }.get(state, "")

    context_lines = [
        "=== BRAINSTORMER PERSONA ===",
        workflow_doc,
        "",
        f"=== CURRENT STATE: {state} ===",
        state_instruction,
    ]

    if raw_idea:
        context_lines += ["", "=== ORIGINAL IDEA ===", raw_idea]

    if refined_idea:
        context_lines += ["", "=== REFINED IDEA SO FAR ===", refined_idea]

    return "\n".join(context_lines)


def detect_approval_signal(reply: str) -> bool:
    """Return True if Claude's reply contains the approval sentinel."""
    return APPROVAL_SENTINEL in reply


def detect_user_approval(user_text: str) -> bool:
    """Return True if the user's message signals approval of the idea brief."""
    lower = user_text.strip().lower()
    return any(signal in lower for signal in _APPROVAL_SIGNALS)


def advance_state(current_state: str, reply: str, user_text: str) -> str:
    """
    Determine the next state based on current state, Claude's reply, and user input.

    Transitions:
      IDEATION → REFINEMENT (after first Q&A)
      REFINEMENT → SYNTHESIS (after second Q&A)
      SYNTHESIS → APPROVED (if approval sentinel in reply)
      APPROVED → TICKET_CREATED (handled by handler after ticket creation)
    """
    if current_state == "IDEATION":
        return "REFINEMENT"

    if current_state == "REFINEMENT":
        return "SYNTHESIS"

    if current_state == "SYNTHESIS":
        if detect_approval_signal(reply):
            return "APPROVED"
        # If user text looked like approval but Claude didn't emit sentinel,
        # stay in SYNTHESIS and let next turn handle it
        return "SYNTHESIS"

    # APPROVED and TICKET_CREATED are terminal — handler manages those
    return current_state


def strip_sentinel(reply: str) -> str:
    """Remove the approval sentinel from the reply before posting to Slack."""
    return reply.replace(APPROVAL_SENTINEL, "").rstrip()


def build_ticket_fields(raw_idea: str, refined_idea: str, synthesis_text: str) -> dict:
    """
    Construct structured fields for a backlog/Kanban ticket from the brainstorm session.
    Returns a dict suitable for passing to BacklogStore.create_ticket() or kanban API.
    Parses the new TASK DEFINITION format with plain-language field names.
    """
    # New TASK DEFINITION format fields
    title = _extract_field(synthesis_text, "Title") or raw_idea[:80]
    summary = _extract_field(synthesis_text, "The Problem") or refined_idea[:200]
    outcome = _extract_field(synthesis_text, "What Success Looks Like") or ""
    impact = _extract_field(synthesis_text, "The Solution") or ""

    title = _normalize_field(title, fallback="Approved idea from Brainstormer", max_chars=120)
    summary = _normalize_field(
        summary,
        fallback="Problem statement was incomplete in chat input. Planner must clarify concrete pain points.",
        max_chars=500,
    )
    impact = _normalize_field(
        impact,
        fallback="Proposed solution needs detailing in Planner phase before implementation.",
        max_chars=700,
    )
    outcome = _normalize_field(
        outcome,
        fallback="A complete implementation plan with acceptance criteria and measurable launch outcomes.",
        max_chars=500,
    )

    return {
        "title": title,
        "summary": summary,
        "requested_outcome": outcome,
        "impact": impact,
        "handoff_target": "planner",
        "status": "ideas",
        "intent": "idea_brainstorm",
    }


def slugify(text: str) -> str:
    """Convert a title to a safe uppercase filename slug (max 50 chars)."""
    slug = re.sub(r"[^\w]+", "_", text.lower()).strip("_")
    return slug[:50].upper()


def build_task_md(
    fields: dict, session_id: str, created_at: str,
    synthesis_text: str = "",
) -> str:
    """
    Build a formatted Markdown task file from brainstorm ticket fields.
    Saved to tasks/{domain}/ideas/TASK_{SLUG}.md in the project repo.
    """
    md = (
        f"# TASK: {fields['title']}\n\n"
        f"**Status**: Ideas — Awaiting Planner\n"
        f"**Created**: {created_at}\n"
        f"**Session**: {session_id}\n\n"
        f"---\n\n"
        f"## The Problem\n{fields['summary']}\n\n"
        f"## The Solution\n{fields['impact']}\n\n"
        f"## What Success Looks Like\n{fields['requested_outcome']}\n\n"
    )
    if synthesis_text:
        md += (
            f"---\n\n"
            f"## Full Brainstormer Output\n\n{synthesis_text}\n\n"
        )
    md += (
        f"---\n\n"
        f"*Created by IAN Brainstormer (v1.1) — awaiting Planner implementation design.*\n"
        f"*To design the implementation plan, say `!plan` in Slack.*\n"
    )
    return md


def validate_task_md(task_md: str) -> tuple[bool, list[str]]:
    """Return (is_valid, missing_sections) for generated TASK markdown."""
    required_sections = (
        "## The Problem",
        "## The Solution",
        "## What Success Looks Like",
    )
    missing = [section for section in required_sections if section not in task_md]
    return (len(missing) == 0, missing)


def _extract_field(text: str, field_name: str) -> str:
    """Extract a field value from synthesis text, capturing multi-line content."""
    marker = f"**{field_name}**:"
    if marker not in text:
        return ""
    start = text.index(marker) + len(marker)
    remaining = text[start:]
    # Find the next bold field marker (e.g. **Title**:, **The Problem**:)
    next_marker = re.search(r'\n\*\*[A-Z][^*]+\*\*:', remaining)
    if next_marker:
        end = start + next_marker.start()
    else:
        end = len(text)
    return text[start:end].strip()


def _normalize_field(value: str, *, fallback: str, max_chars: int) -> str:
    cleaned = re.sub(r"\s+", " ", (value or "")).strip()
    if not cleaned or cleaned in {"-", "N/A", "n/a", "..."}:
        cleaned = fallback
    return cleaned[:max_chars]
