"""
slack/handlers.py — Message handler for the polling-based Slack agent.

Flow per message:
  1. Strip @mentions, parse text
  2. Admin command dispatch (!status, !help, !cost, !budget, !memory, !tools,
     !history, !health, !reload, !reset)
  3. Session load + auto-summarise at 20 turns
  4. Budget gate (block if over limit)
  5. Model router (pure Python — no API call)
  6. Project context injection
  7. Claude API call with full tool-use loop
  8. Cost recording + history persistence
  9. Post via Haiku or Sonnet account
"""
from __future__ import annotations

import logging
import re
import json
from typing import Any, Callable
from pathlib import Path

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from agent.brainstormer import (
    advance_state,
    build_system_prompt as brainstorm_system_prompt,
    build_task_md,
    build_ticket_fields,
    detect_approval_signal,
    detect_user_approval,
    slugify,
    strip_sentinel,
)
from agent.budget_tracker import BudgetTracker
from agent.claude_client import ClaudeClient
from agent.config import Config
from agent.handoff import build_claude_code_handoff
from agent.intent_router import IntentType, allowed_tools_for_intent, classify_intent
from agent.model_router import select_model
from agent.persona_router import Persona, select_persona
from agent.planner_context import PlannerContextLoader
from agent.project_router import ProjectRouter
from agent.runtime_control import RuntimeControl
from agent.security import sanitise_input
from audit.logger import AuditLogger
from memory.db import migrate
from memory.history import ConversationHistory
from memory.backlog import BacklogStore
from memory.store import MemoryStore
from memory.summarizer import SessionSummarizer
from slack.admin_commands import (
    cmd_budget,
    cmd_cost,
    cmd_health,
    cmd_help,
    cmd_history,
    cmd_memory,
    cmd_reload,
    cmd_tools,
)
from slack.formatters import format_status
from tools.approval import ApprovalGate
from tools.base import ToolRegistry
from tools.filesystem import FilesystemListTool, FilesystemReadTool, FilesystemWriteTool
from tools.shell import ShellTool
from tools.web_search import WebSearchTool

_CLIENT_SUPPORT_CTX = """\
You are IAN, an AI support assistant for lavprishjemmeside.dk — a Danish CMS \
product for building affordable websites. You are responding to a client in \
their dedicated support channel.

Role:
- Answer product questions clearly and helpfully
- Help with website, account, billing, and feature questions
- Always respond in the same language the client writes in (Danish or English)
- Be professional, warm, and concise — clients are typically small business owners
- If an issue cannot be resolved here, direct them to email support@lavprishjemmeside.dk

Do NOT reveal internal tooling, owner information, or pricing margins.
"""

logger = logging.getLogger(__name__)

Handler = Callable[[dict], None]

MAX_TOOL_ROUNDS = 8


def _resolve_repo_root(cfg: Config) -> Path:
    """Resolve repository root where PROJECT_CONTEXT.md and tasks/ live."""
    candidates = [cfg.projects.the_artisan_path, cfg.project_root, cfg.project_root.parent]
    for candidate in candidates:
        root = Path(candidate)
        if (root / "PROJECT_CONTEXT.md").exists():
            return root
    return cfg.project_root


def _clean_request_headline(text: str, fallback: str = "Request") -> str:
    """Build a concise, clean task headline from free-form Slack text."""
    if not text:
        return fallback
    cleaned = re.sub(r"<([^>|]+)\|([^>]+)>", r"\2", text)
    cleaned = re.sub(r"https?://\S+", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -:\n\t")
    cleaned = re.sub(
        r"^(i want|i need|please|can you|could you|jeg vil|jeg har brug for|kan du)\s+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()
    cleaned = re.sub(r":\s*(in|på|on)\s*$", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = cleaned.rstrip(":;,- ")
    if not cleaned:
        return fallback
    return cleaned[:120]


def _run_with_tools(
    *,
    claude: ClaudeClient,
    registry: ToolRegistry,
    approval_gate: ApprovalGate,
    messages: list[dict[str, Any]],
    model: str,
    extra_system_context: str | None,
    allowed_tools: frozenset[str] | None,
    audit: AuditLogger | None = None,
) -> tuple[str, Any]:
    """
    Run the Claude tool-use loop until end_turn or max rounds.

    Returns (final_text_reply, last_usage). If max rounds reached,
    usage is None and reply is an error message.
    """
    for _ in range(MAX_TOOL_ROUNDS):
        response = claude.chat(
            messages=messages,
            model=model,
            extra_system_context=extra_system_context,
            tools=(
                [t for t in registry.get_definitions() if t["name"] in allowed_tools]
                if allowed_tools is not None
                else registry.get_definitions()
            ),
        )

        if response.stop_reason != "tool_use":
            return claude.extract_text(response), response.usage

        # Build assistant content block and execute each tool call
        assistant_content: list[dict[str, Any]] = []
        tool_results: list[dict[str, Any]] = []

        for block in response.content:
            if block.type == "text":
                assistant_content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                if audit is not None:
                    audit.tool_call(block.name, block.input if isinstance(block.input, dict) else {"raw": str(block.input)})
                if allowed_tools is not None and block.name not in allowed_tools:
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": "Tool blocked by IAN policy for this intent.",
                    })
                    if audit is not None:
                        audit.tool_result(block.name, False, "blocked by policy")
                    continue
                assistant_content.append({
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })
                if registry.approval_required(block.name):
                    approved = approval_gate.request(block.name, block.input)
                    result = registry.execute(block.name, block.input) if approved else "Tool rejected by user."
                else:
                    result = registry.execute(block.name, block.input)
                if audit is not None:
                    audit.tool_result(block.name, True, result)

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        messages = [
            *messages,
            {"role": "assistant", "content": assistant_content},
            {"role": "user", "content": tool_results},
        ]

    return "(max tool rounds reached — please try again)", None


def make_handler(
    cfg: Config,
    haiku_client: WebClient,
    sonnet_client: WebClient,
    audit: AuditLogger | None = None,
    runtime_control: RuntimeControl | None = None,
) -> Handler:
    repo_root = _resolve_repo_root(cfg)
    migrate(cfg.memory.db_path)

    claude = ClaudeClient(cfg)
    history = ConversationHistory(cfg.memory.db_path, cfg.memory.max_conversation_tokens)
    store = MemoryStore(cfg.memory.db_path, cfg.memory.markdown_path)
    backlog = BacklogStore(cfg.memory.db_path)
    summarizer = SessionSummarizer(cfg, history, claude)
    budget = BudgetTracker(
        cfg.memory.db_path,
        daily_limit=cfg.budget.daily_limit_usd,
        daily_warn_pct=cfg.budget.daily_warn_pct,
        monthly_limit=cfg.budget.monthly_limit_usd,
        monthly_warn_pct=cfg.budget.monthly_warn_pct,
    )
    project_router = ProjectRouter(repo_root / "projects")

    # Tool registry
    registry = ToolRegistry()
    registry.register(FilesystemReadTool(cfg))
    registry.register(FilesystemWriteTool(cfg))
    registry.register(FilesystemListTool(cfg))
    registry.register(ShellTool(cfg))
    registry.register(WebSearchTool(cfg))

    if cfg.linkedin.enabled and cfg.linkedin.session_cookie:
        from tools.linkedin import (
            LinkedInCommentTool,
            LinkedInConnectTool,
            LinkedInFeedTool,
            LinkedInLikeTool,
            LinkedInMessageTool,
            LinkedInPostTool,
        )
        registry.register(LinkedInFeedTool(cfg))
        registry.register(LinkedInPostTool(cfg))
        registry.register(LinkedInLikeTool(cfg))
        registry.register(LinkedInCommentTool(cfg))
        registry.register(LinkedInConnectTool(cfg))
        registry.register(LinkedInMessageTool(cfg))
        logger.info("linkedin tools registered")

    approval_gate = ApprovalGate(
        client=haiku_client,
        owner_user_id=cfg.slack.owner_user_id,
        channel_id=cfg.slack.control_channel_id,
        timeout_seconds=getattr(cfg.security, "approval_timeout_seconds", 120),
    )

    def _post(client: WebClient, channel: str, text: str, thread_ts: str | None) -> None:
        try:
            kwargs: dict = {"channel": channel, "text": text}
            if thread_ts:
                kwargs["thread_ts"] = thread_ts
            client.chat_postMessage(**kwargs)
        except SlackApiError:
            logger.exception("Failed to post Slack message")

    def _post_blocks(client: WebClient, channel: str, blocks: dict, thread_ts: str | None) -> None:
        try:
            kwargs: dict = {"channel": channel, **blocks}
            if thread_ts:
                kwargs["thread_ts"] = thread_ts
            client.chat_postMessage(**kwargs)
        except SlackApiError:
            logger.exception("Failed to post blocks")

    def _create_backlog_ticket(
        *,
        message: dict[str, Any],
        intent: IntentType,
        handoff_target: str,
        title_prefix: str,
    ) -> tuple[str, list[str]]:
        text = message.get("text", "").strip()
        summary = text[:500]
        if intent in {IntentType.IDEA_BRAINSTORM, IntentType.PLAN_DESIGN}:
            title = _clean_request_headline(title_prefix, fallback=title_prefix)
        else:
            headline = _clean_request_headline(summary, fallback=title_prefix)
            title = f"{title_prefix}: {headline}" if headline else title_prefix
        requester = message.get("user", "unknown")
        channel = message.get("channel", cfg.slack.control_channel_id)
        ticket = backlog.create_ticket(
            title=title,
            requester=requester,
            channel=channel,
            summary=summary or "(no summary)",
            requested_outcome=summary or "(not provided)",
            impact="triage pending",
            handoff_target=handoff_target,
            intent=intent.value,
            handoff_payload="",
            linked_plan_files=[],
        )
        linked_plan_files = ticket.linked_plan_files
        if handoff_target == "claude_code":
            # Build structured contract for Claude Code handoff, including related planning files.
            handoff = build_claude_code_handoff(
                project_root=repo_root,
                ticket_id=ticket.ticket_id,
                request_text=summary or "(not provided)",
            )
            linked_plan_files = handoff.linked_plan_files
            handoff_payload = json.dumps(
                {
                    "handoff_target": handoff.handoff_target,
                    "ticket_id": handoff.ticket_id,
                    "request_summary": handoff.request_summary,
                    "requested_outcome": handoff.requested_outcome,
                    "linked_plan_files": handoff.linked_plan_files,
                    "execution_policy": handoff.execution_policy,
                },
                ensure_ascii=False,
            )
            backlog.update_handoff_metadata(
                ticket_id=ticket.ticket_id,
                handoff_payload=handoff_payload,
                linked_plan_files=linked_plan_files,
            )
        logger.info("backlog.ticket_created id=%s intent=%s", ticket.ticket_id, intent.value)
        if cfg.kanban.enabled and cfg.kanban.api_key:
            from agent.kanban_sync import sync_to_kanban
            sync_to_kanban(
                cfg.kanban.api_url,
                cfg.kanban.api_key,
                title=title,
                description=f"**Summary:** {summary or '(none)'}\n\n**Local:** {ticket.ticket_id}",
                intent=intent.value,
                handoff_target=handoff_target,
                priority="medium",
            )
        return ticket.ticket_id, linked_plan_files

    def _policy_reply(
        intent: IntentType,
        confidence: float,
        ticket_id: str | None = None,
        linked_plan_files: list[str] | None = None,
    ) -> str:
        confidence_str = f"{confidence:.2f}"
        linked_plan_files = linked_plan_files or []
        plans_line = ", ".join(f"`{p}`" for p in linked_plan_files) if linked_plan_files else "`none found`"
        if intent == IntentType.NEEDS_CLARIFICATION:
            return (
                "*NEEDS_CLARIFICATION*\n"
                f"- intent: `{intent.value}`\n"
                f"- confidence: `{confidence_str}`\n"
                "- sources_used: `none`\n"
                "- action_taken: awaiting clarification\n"
                "- next_step: Please clarify whether this is a FAQ, status lookup, runbook guidance, triage, or a request to capture."
            )

        if intent == IntentType.DEV_HANDOFF:
            return (
                "*DEV_HANDOFF_TO_CLAUDE_CODE*\n"
                f"- intent: `{intent.value}`\n"
                f"- confidence: `{confidence_str}`\n"
                "- sources_used: `request text`\n"
                f"- ticket_id: `{ticket_id or 'N/A'}`\n"
                f"- linked_plan_files: {plans_line}\n"
                "- action_taken: development task execution blocked in IAN\n"
                "- next_step: Route this to Claude Code with relevant `tasks/**/*.md` plan context."
            )

        return (
            "*OUT_OF_SCOPE_BACKLOG_CREATED*\n"
            f"- intent: `{intent.value}`\n"
            f"- confidence: `{confidence_str}`\n"
            "- sources_used: `request text`\n"
            f"- ticket_id: `{ticket_id or 'N/A'}`\n"
            "- action_taken: request marked out-of-scope for IAN fixed environment and backlog ticket created\n"
            "- next_step: Triage ticket and assign owner (SLA: within 1 business day)."
        )

    planner_loader = PlannerContextLoader(repo_root)

    def _active_agent_type(persona: str | None = None, model: str | None = None) -> str:
        if persona == Persona.BRAINSTORMER:
            return "brainstormer"
        if persona == Persona.PLANNER:
            return "planner"
        if model == cfg.anthropic.model_heavy:
            return "planner"
        if model == cfg.anthropic.model_default:
            return "brainstormer"
        return "ian"

    def _handle_brainstormer(
        message: dict,
        session_id: str,
        text: str,
        channel: str,
        thread_ts: str | None,
    ) -> None:
        """
        Brainstormer persona handler — multi-turn idea refinement workflow.
        Uses Haiku model. State persisted in session_metadata.
        """
        from datetime import datetime

        meta = history.get_session_metadata(session_id)
        if meta.get("persona") != Persona.BRAINSTORMER:
            # First entry — initialise state
            meta = {
                "persona": Persona.BRAINSTORMER,
                "brainstorm_state": "IDEATION",
                "raw_idea": text,
                "refined_idea": None,
            }

        state = meta.get("brainstorm_state", "IDEATION")
        raw_idea = meta.get("raw_idea", text)
        refined_idea = meta.get("refined_idea")

        # Detect if user is approving the Task Definition this turn
        user_approving = state == "SYNTHESIS" and detect_user_approval(text)

        # Load compact product context so Brainstormer knows what this product is
        # (prevents asking users technical questions like "what's your tech stack?")
        product_summary = planner_loader.load_product_summary(max_chars=2000)
        product_block = (
            "\n\n=== PRODUCT CONTEXT (background reference — never expose details to user) ===\n"
            + product_summary
            + "\n"
        )

        # Build state-specific system context with approval-pending flag
        extra_ctx = product_block + brainstorm_system_prompt(
            state, raw_idea, refined_idea, approval_pending=user_approving
        )

        history.add_message(session_id, "user", text)
        messages = history.get_messages(session_id)
        if runtime_control is not None:
            runtime_control.mark_operating(agent_type="brainstormer", current_task="Brainstormer workflow")

        try:
            reply, usage = _run_with_tools(
                claude=claude,
                registry=registry,
                approval_gate=approval_gate,
                messages=messages,
                model=cfg.anthropic.model_default,  # Brainstormer always uses Haiku
                extra_system_context=extra_ctx,
                allowed_tools=frozenset(),  # No tools for Brainstormer
                audit=audit,
            )
        except Exception:
            logger.exception("Brainstormer Claude API error")
            if runtime_control is not None:
                runtime_control.mark_idle(agent_type="brainstormer")
            _post(haiku_client, channel, ":red_circle: Brainstormer error. Try again.", thread_ts)
            return

        if usage is None:
            if runtime_control is not None:
                runtime_control.mark_idle(agent_type="brainstormer")
            _post(haiku_client, channel, reply, thread_ts)
            return

        # Advance state
        next_state = advance_state(state, reply, text)
        meta["brainstorm_state"] = next_state

        # Store synthesis text for ticket building on approval turn
        if state == "SYNTHESIS" and not user_approving:
            meta["synthesis_text"] = reply

        # Track refinements
        if state == "REFINEMENT":
            meta["refined_idea"] = text

        # If approved, create Kanban ticket + write MD file + post completion message
        if detect_approval_signal(reply):
            synthesis_text = meta.get("synthesis_text", "")
            ticket_fields = build_ticket_fields(raw_idea, refined_idea or raw_idea, synthesis_text)
            ticket_id, _ = _create_backlog_ticket(
                message=message,
                intent=IntentType.IDEA_BRAINSTORM,
                handoff_target="planner",
                title_prefix=ticket_fields["title"],
            )
            meta["brainstorm_state"] = "TICKET_CREATED"
            meta["ticket_id"] = ticket_id
            logger.info("brainstormer.ticket_created id=%s", ticket_id)

            # Write task MD file to repo tasks/pending/
            slug = slugify(ticket_fields["title"])
            task_md_path = repo_root / "tasks" / "pending" / f"TASK_{slug}.md"
            try:
                task_md_path.parent.mkdir(parents=True, exist_ok=True)
                task_md_path.write_text(
                    build_task_md(ticket_fields, session_id, datetime.now().isoformat()),
                    encoding="utf-8",
                )
                logger.info("brainstormer.task_md_written path=%s", task_md_path)
                md_note = f"📄 `tasks/pending/TASK_{slug}.md`"
            except OSError as e:
                logger.warning("brainstormer.task_md_write_failed: %s", e)
                md_note = "(file save failed — check logs)"

        history.set_session_metadata(session_id, meta)

        # Record usage
        cache_written = getattr(usage, "cache_creation_input_tokens", 0) or 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        usage_cost = budget.record_usage(
            cfg.anthropic.model_default,
            usage.input_tokens, usage.output_tokens,
            cache_written, cache_read,
        )
        history.add_message(
            session_id, role="assistant", content=reply,
            model=cfg.anthropic.model_default,
            input_tokens=usage.input_tokens, output_tokens=usage.output_tokens,
            cache_written=cache_written, cache_read=cache_read,
        )

        # Post Claude's reply (sentinel stripped)
        clean_reply = strip_sentinel(reply)
        _post(haiku_client, channel, clean_reply, thread_ts)

        # If task was just created, post a clear completion + next-step message
        if detect_approval_signal(reply):
            _post(
                haiku_client,
                channel,
                f"✅ *Task saved to Kanban → Ideas*\n"
                f"{md_note}\n\n"
                "Planner starter nu automatisk og laver implementeringsplan + estimat.",
                thread_ts,
            )
            plan_prompt = (
                "Create a full implementation plan for this approved task.\n"
                f"Title: {ticket_fields.get('title', raw_idea)}\n"
                f"Problem: {ticket_fields.get('summary', '')}\n"
                f"Solution: {ticket_fields.get('impact', '')}\n"
                f"Success criteria: {ticket_fields.get('requested_outcome', '')}\n"
                f"Task file: tasks/pending/TASK_{slug}.md\n"
                "Return full planner output including development cost estimate."
            )
            try:
                _handle_planner(
                    message,
                    session_id,
                    plan_prompt,
                    channel,
                    thread_ts,
                    task_title_hint=ticket_fields.get("title", "Approved task"),
                )
            except Exception:
                logger.exception("brainstormer.auto_planner_failed")
                _post(
                    haiku_client,
                    channel,
                    ":warning: Automatisk planner-kørsel fejlede. Skriv `!plan` for manuel kørsel.",
                    thread_ts,
                )
        if runtime_control is not None:
            runtime_control.assignment_complete(
                agent_type="brainstormer",
                assignment_type="brainstorm_reply",
                ticket_id=meta.get("ticket_id"),
                tokens_delta=int((usage.input_tokens or 0) + (usage.output_tokens or 0)),
                cost_delta_usd=float(usage_cost or 0.0),
                messages_delta=1,
                metadata={"state": meta.get("brainstorm_state", "unknown")},
            )

    def _handle_planner(
        message: dict,
        session_id: str,
        text: str,
        channel: str,
        thread_ts: str | None,
        task_title_hint: str | None = None,
    ) -> None:
        """
        Planner persona handler — full-context implementation plan design.
        Uses Sonnet model. Loads all docs via PlannerContextLoader.
        """
        meta = history.get_session_metadata(session_id)
        if meta.get("persona") != Persona.PLANNER:
            meta = {
                "persona": Persona.PLANNER,
                "planner_state": "PLANNING",
                "task_description": text,
                "task_title_hint": task_title_hint or _clean_request_headline(text, fallback="Planner task"),
            }
        elif task_title_hint:
            meta["task_title_hint"] = task_title_hint

        _post(haiku_client, channel, "_Planner loading full project context..._", thread_ts)

        # Load all docs for Planner context
        planner_ctx = planner_loader.load_all()
        planner_instruction = (
            "\n\n=== PLANNER PERSONA ===\n"
            "You are the Planner. Your sole purpose is to design a comprehensive, "
            "production-ready implementation plan for the given task.\n\n"
            "REQUIRED OUTPUT STRUCTURE (include all 10 sections):\n"
            "1. Technical Approach\n"
            "2. Files to Modify\n"
            "3. New Files to Create\n"
            "4. Database Changes\n"
            "5. API Changes\n"
            "6. UI Changes\n"
            "7. Testing Approach\n"
            "8. Deployment Steps\n"
            "9. Timeline Estimate\n"
            "10. Complexity Assessment: Low / Medium / High / Very High\n\n"
            "SEPARATE APPLICATION RULE: If complexity is Very High or requires new "
            "infrastructure (new domain, new server), specify it as a standalone application "
            "at api.[domain] with a full build specification.\n\n"
            "COST ESTIMATE (required last section):\n"
            "## Cost Estimate\n"
            "- Estimated input tokens for implementation run: ~{N}\n"
            "- Estimated output tokens: ~{M}\n"
            "- API cost (Sonnet @ $3/1M in, $15/1M out): ~${X:.4f}\n"
            "- Your cost (×20 real-world rate): ~${Y:.2f}\n\n"
            "End your reply with: [PLAN:READY]"
        )
        extra_ctx = planner_ctx + planner_instruction

        history.add_message(session_id, "user", text)
        messages = history.get_messages(session_id)

        try:
            reply, usage = _run_with_tools(
                claude=claude,
                registry=registry,
                approval_gate=approval_gate,
                messages=messages,
                model=cfg.anthropic.model_heavy,  # Planner always uses Sonnet
                extra_system_context=extra_ctx,
                allowed_tools=frozenset({"filesystem_read", "filesystem_list"}),
                audit=audit,
            )
        except Exception:
            logger.exception("Planner Claude API error")
            if runtime_control is not None:
                runtime_control.mark_idle(agent_type="planner")
            _post(haiku_client, channel, ":red_circle: Planner error. Try again.", thread_ts)
            return

        if usage is None:
            if runtime_control is not None:
                runtime_control.mark_idle(agent_type="planner")
            _post(haiku_client, channel, reply, thread_ts)
            return

        # If plan is ready, create a Kanban ticket in "plans" column
        if "[PLAN:READY]" in reply:
            if meta.get("planner_state") != "PLAN_CREATED":
                title_hint = meta.get("task_title_hint") or _clean_request_headline(meta.get("task_description", text))
                ticket_id, _ = _create_backlog_ticket(
                    message=message,
                    intent=IntentType.PLAN_DESIGN,
                    handoff_target="human",
                    title_prefix=f"Plan: {title_hint}",
                )
                meta["planner_state"] = "PLAN_CREATED"
                meta["ticket_id"] = ticket_id
                logger.info("planner.plan_created id=%s", ticket_id)

        history.set_session_metadata(session_id, meta)

        # Record usage
        cache_written = getattr(usage, "cache_creation_input_tokens", 0) or 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        usage_cost = budget.record_usage(
            cfg.anthropic.model_heavy,
            usage.input_tokens, usage.output_tokens,
            cache_written, cache_read,
        )
        history.add_message(
            session_id, role="assistant", content=reply,
            model=cfg.anthropic.model_heavy,
            input_tokens=usage.input_tokens, output_tokens=usage.output_tokens,
            cache_written=cache_written, cache_read=cache_read,
        )

        clean_reply = reply.replace("[PLAN:READY]", "").rstrip()
        _post(sonnet_client, channel, clean_reply, thread_ts)
        if runtime_control is not None:
            runtime_control.assignment_complete(
                agent_type="planner",
                assignment_type="planner_reply",
                ticket_id=meta.get("ticket_id"),
                tokens_delta=int((usage.input_tokens or 0) + (usage.output_tokens or 0)),
                cost_delta_usd=float(usage_cost or 0.0),
                messages_delta=1,
                metadata={"planner_state": meta.get("planner_state", "unknown")},
            )

    def handle(message: dict) -> None:
        raw_text: str = message.get("text", "").strip()
        channel: str = message.get("channel", cfg.slack.control_channel_id)
        thread_ts: str | None = message.get("thread_ts")

        text = re.sub(r"^<@[A-Z0-9]+>\s*", "", raw_text).strip()
        text = sanitise_input(text)
        if not text:
            return
        if audit is not None:
            audit.user_message(message.get("user", "unknown"), text, channel)

        lower = text.lower()
        is_client_ch = channel in cfg.slack.client_channels

        # ---- Admin commands — owner-only, blocked in client channels ----
        if not is_client_ch:
            if lower == "!status":
                _post_blocks(haiku_client, channel, format_status(cfg), thread_ts)
                return

            if lower == "!help":
                _post(haiku_client, channel, cmd_help(), thread_ts)
                return

            if lower == "!cost":
                _post(haiku_client, channel, cmd_cost(budget), thread_ts)
                return

            if lower == "!budget":
                _post(haiku_client, channel, cmd_budget(budget), thread_ts)
                return

            if lower.startswith("!memory"):
                query = text[7:].strip()
                _post(haiku_client, channel, cmd_memory(query, store), thread_ts)
                return

            if lower == "!tools":
                _post(haiku_client, channel, cmd_tools(registry), thread_ts)
                return

            if lower.startswith("!history"):
                parts = text.split()
                n = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 5
                session_id = history.get_or_create_session(channel)
                _post(haiku_client, channel, cmd_history(session_id, history, n), thread_ts)
                return

            if lower == "!health":
                blocks = cmd_health(cfg, cfg.memory.db_path, haiku_client)
                _post_blocks(haiku_client, channel, blocks, thread_ts)
                return

            if lower == "!reload":
                _post(haiku_client, channel, cmd_reload(cfg.project_root, cfg.memory.startup_files), thread_ts)
                return

            if lower == "!reset":
                session_id = history.get_or_create_session(channel)
                history.end_session(session_id)
                _post(haiku_client, channel, ":white_check_mark: Session reset. Starting fresh.", thread_ts)
                return

        if runtime_control is not None and not runtime_control.is_enabled():
            _post(
                haiku_client,
                channel,
                ":red_circle: IAN is currently turned off from Master dashboard. No assignments are being processed.",
                thread_ts,
            )
            return

        # ----------------------------------------------------------------
        # Conversational path
        # ----------------------------------------------------------------
        session_id = history.get_or_create_session(channel)
        if summarizer.should_summarize(session_id):
            _post(haiku_client, channel, "_Compressing conversation history..._", thread_ts)
            session_id = summarizer.summarize_and_rotate(session_id, channel)

        # Budget gate
        bstatus = budget.check()
        if bstatus.blocked:
            _post(haiku_client, channel, f":no_entry: {bstatus.summary()}", thread_ts)
            return
        if bstatus.warned:
            _post(haiku_client, channel, f":warning: {bstatus.summary()}", thread_ts)

        # ---- Persona routing (v1.1) — Brainstormer / Planner / General ----
        session_meta = history.get_session_metadata(session_id)
        persona, persona_reason = select_persona(text, session_meta)
        logger.info("persona=%s reason=%s", persona, persona_reason)

        if persona == Persona.BRAINSTORMER:
            _handle_brainstormer(message, session_id, text, channel, thread_ts)
            return

        if persona == Persona.PLANNER:
            _handle_planner(message, session_id, text, channel, thread_ts)
            return

        # ---- Intent classification (always runs for logging) ----
        decision = classify_intent(text)
        logger.info(
            "intent=%s confidence=%.2f reason=%s",
            decision.intent.value,
            decision.confidence,
            decision.reason,
        )

        # ---- Fixed-environment intent gate (all conversational channels) ----
        if decision.intent in {
            IntentType.NEEDS_CLARIFICATION,
            IntentType.OUT_OF_SCOPE,
            IntentType.DEV_HANDOFF,
        }:
            ticket_id = None
            linked_plan_files: list[str] = []
            policy_action = "policy_blocked"
            if decision.intent == IntentType.OUT_OF_SCOPE:
                ticket_id, linked_plan_files = _create_backlog_ticket(
                    message=message,
                    intent=decision.intent,
                    handoff_target="backlog_triage",
                    title_prefix="Out-of-scope request",
                )
                policy_action = "out_of_scope_backlog_created"
            elif decision.intent == IntentType.DEV_HANDOFF:
                ticket_id, linked_plan_files = _create_backlog_ticket(
                    message=message,
                    intent=decision.intent,
                    handoff_target="claude_code",
                    title_prefix="Dev handoff request",
                )
                policy_action = "dev_handoff_backlog_created"
            if audit is not None:
                audit.policy_decision(
                    intent=decision.intent.value,
                    confidence=decision.confidence,
                    policy_decision=policy_action,
                    ticket_id=ticket_id,
                    model_used="none_policy_gate",
                    reason=decision.reason,
                )
            _post(
                haiku_client,
                channel,
                _policy_reply(decision.intent, decision.confidence, ticket_id, linked_plan_files),
                thread_ts,
            )
            return

        if decision.intent == IntentType.REQUEST_CAPTURE:
            ticket_id, _ = _create_backlog_ticket(
                message=message,
                intent=decision.intent,
                handoff_target="backlog_triage",
                title_prefix="Captured request",
            )
            if audit is not None:
                audit.policy_decision(
                    intent=decision.intent.value,
                    confidence=decision.confidence,
                    policy_decision="request_captured_backlog_created",
                    ticket_id=ticket_id,
                    model_used="none_policy_gate",
                    reason=decision.reason,
                )
            _post(
                haiku_client,
                channel,
                (
                    "*OUT_OF_SCOPE_BACKLOG_CREATED*\n"
                    f"- intent: `{decision.intent.value}`\n"
                    f"- confidence: `{decision.confidence:.2f}`\n"
                    "- sources_used: `request text`\n"
                    f"- ticket_id: `{ticket_id}`\n"
                    "- action_taken: request captured as structured backlog item\n"
                    "- next_step: Triage and prioritize this ticket (SLA: within 1 business day)."
                ),
                thread_ts,
            )
            return

        # Model routing
        model, reason = select_model(text, cfg.anthropic.model_default, cfg.anthropic.model_heavy)
        logger.info("model=%s reason=%s", model, reason)
        if audit is not None:
            audit.model_selected(model=model, reason=reason, text_preview=text)
            audit.policy_decision(
                intent=decision.intent.value,
                confidence=decision.confidence,
                policy_decision="in_scope_allowed",
                ticket_id="",
                model_used=model,
                reason=decision.reason,
            )

        prompt = text
        if prompt.lower().startswith("!sonnet"):
            prompt = prompt[7:].strip() or "Hello"
        elif prompt.lower().startswith("!plan"):
            prompt = prompt[5:].strip() or "Hello"
        elif prompt.lower().startswith("!brainstorm"):
            prompt = prompt[11:].strip() or "Hello"

        if runtime_control is not None:
            runtime_control.mark_operating(
                agent_type=_active_agent_type(model=model),
                current_task=f"Intent={decision.intent.value}",
            )

        if is_client_ch:
            # Always inject lavprishjemmeside product context in client channels
            lph_path = repo_root / "projects" / "lavprishjemmeside.md"
            proj_content = lph_path.read_text(encoding="utf-8") if lph_path.exists() else ""
            extra_ctx = _CLIENT_SUPPORT_CTX + ("\n\n[Product Context]\n" + proj_content if proj_content else "")
        else:
            extra_ctx = project_router.get_context(prompt)
        policy_ctx = (
            "\n\n[IAN Intent Policy]\n"
            f"resolved_intent={decision.intent.value}\n"
            f"confidence={decision.confidence:.2f}\n"
            "Operate only within this intent and do not expand scope."
        )
        extra_ctx = (extra_ctx or "") + policy_ctx
        allowed_tools = allowed_tools_for_intent(decision.intent)

        history.add_message(session_id, "user", prompt)
        messages = history.get_messages(session_id)

        try:
            reply, usage = _run_with_tools(
                claude=claude,
                registry=registry,
                approval_gate=approval_gate,
                messages=messages,
                model=model,
                extra_system_context=extra_ctx,
                allowed_tools=allowed_tools,
                audit=audit,
            )
        except Exception:
            logger.exception("Claude API error")
            if audit is not None:
                audit.error("Claude API error in handler")
            if runtime_control is not None:
                runtime_control.mark_idle(agent_type=_active_agent_type(model=model))
            _post(haiku_client, channel, ":red_circle: Error calling Claude. Check logs.", thread_ts)
            return

        # Max rounds hit — post error and bail without recording usage
        if usage is None:
            if runtime_control is not None:
                runtime_control.mark_idle(agent_type=_active_agent_type(model=model))
            _post(haiku_client, channel, reply, thread_ts)
            return

        cache_written = getattr(usage, "cache_creation_input_tokens", 0) or 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        usage_cost = budget.record_usage(model, usage.input_tokens, usage.output_tokens, cache_written, cache_read)

        history.add_message(
            session_id, role="assistant", content=reply, model=model,
            input_tokens=usage.input_tokens, output_tokens=usage.output_tokens,
            cache_written=cache_written, cache_read=cache_read,
        )
        if audit is not None:
            audit.agent_reply(
                text=reply,
                model=model,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                cache_written=cache_written,
                cache_read=cache_read,
            )

        client = sonnet_client if model == cfg.anthropic.model_heavy else haiku_client
        _post(client, channel, reply, thread_ts)
        if runtime_control is not None:
            runtime_control.assignment_complete(
                agent_type=_active_agent_type(model=model),
                assignment_type=f"intent_{decision.intent.value}",
                ticket_id=None,
                tokens_delta=int((usage.input_tokens or 0) + (usage.output_tokens or 0)),
                cost_delta_usd=float(usage_cost or 0.0),
                messages_delta=1,
                metadata={"intent": decision.intent.value},
            )

    return handle
