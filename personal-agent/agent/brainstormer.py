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


def build_system_prompt(state: str, raw_idea: str, refined_idea: str | None = None) -> str:
    """
    Build a state-specific system prompt block for the Brainstormer persona.
    This is prepended to the IAN SOUL/USER context before calling Claude.
    """
    workflow_doc = _load_workflow_doc()

    state_instruction = {
        "IDEATION": (
            "You are in the IDEATION state. The user has just shared a raw idea. "
            "Your job is to:\n"
            "1. Acknowledge the idea briefly (1 sentence)\n"
            "2. Ask exactly 2-3 targeted clarifying questions to understand scope, "
            "target users, and success criteria\n"
            "3. NEVER suggest the idea is ready or propose creating a task yet\n"
            "4. Be a critical thinker — probe for weak spots"
        ),
        "REFINEMENT": (
            "You are in the REFINEMENT state. The user has answered your clarifying questions. "
            "Your job is to:\n"
            "1. Synthesize what you've learned\n"
            "2. Suggest at least ONE world-class improvement or upgrade to the idea\n"
            "3. Ask 1-2 deeper questions about constraints, edge cases, or risks\n"
            "4. Still do NOT create a task — keep refining"
        ),
        "SYNTHESIS": (
            "You are in the SYNTHESIS state. You have enough information. "
            "Your job is to present a complete structured brief:\n\n"
            "**[IDEA BRIEF]**\n"
            "- **Title**: (concise, action-oriented)\n"
            "- **Problem Statement**: (what pain does this solve?)\n"
            "- **Proposed Solution**: (refined from dialogue)\n"
            "- **Target Users**: (who benefits?)\n"
            "- **Success Metrics**: (how do we know it worked?)\n"
            "- **Estimated Complexity**: Low / Medium / High\n"
            "- **Risks**: (1-3 key risks)\n\n"
            "End with: 'Shall I create a Kanban task for this idea? Reply **yes** to approve.'\n\n"
            "If the user approves (says yes/approve/looks good/etc.), end your NEXT reply with: "
            f"{APPROVAL_SENTINEL}"
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
        context_lines += ["", f"=== ORIGINAL IDEA ===", raw_idea]

    if refined_idea:
        context_lines += ["", f"=== REFINED IDEA SO FAR ===", refined_idea]

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
    """
    # Extract title from synthesis if it contains [IDEA BRIEF] structure
    title = _extract_field(synthesis_text, "Title") or raw_idea[:80]
    summary = _extract_field(synthesis_text, "Problem Statement") or refined_idea[:200]
    outcome = _extract_field(synthesis_text, "Success Metrics") or ""
    impact = _extract_field(synthesis_text, "Proposed Solution") or ""

    return {
        "title": title,
        "summary": summary,
        "requested_outcome": outcome,
        "impact": impact,
        "handoff_target": "planner",
        "status": "ideas",
        "intent": "idea_brainstorm",
    }


def _extract_field(text: str, field_name: str) -> str:
    """Extract a field value from the synthesis brief text."""
    marker = f"**{field_name}**:"
    if marker not in text:
        return ""
    start = text.index(marker) + len(marker)
    end = text.find("\n", start)
    return text[start:end].strip() if end != -1 else text[start:].strip()
