"""
slack/admin_commands.py — All !command handlers for the control channel.

Commands:
  !status              — Agent status (model, uptime, budget, cache)
  !help                — Full command list
  !cost                — Today's spend breakdown by model
  !budget              — Daily/monthly budget status
  !memory <query>      — Search memory notes (FTS5)
  !tools               — List registered tools + approval requirements
  !history [n]         — Show last N conversation turns (default 5)
  !health              — Check all subsystems (Slack, DB, disk, budget)
  !reload              — Reload SOUL.md/USER.md/IDENTITY.md from disk
  !reset               — End current session, start fresh
  !sonnet <prompt>     — Force Sonnet (handled in main handler)

All functions return a string or Block Kit dict suitable for chat_postMessage.
"""
from __future__ import annotations

import platform
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agent.budget_tracker import BudgetTracker
from agent.config import Config
from memory.history import ConversationHistory
from memory.store import MemoryStore
from tools.base import ToolRegistry


def cmd_help() -> str:
    return (
        "*IAN — Available Commands*\n"
        "```\n"
        "!status              Agent status, model, cache hit rate\n"
        "!help                This message\n"
        "!cost                Today's API spend by model\n"
        "!budget              Daily/monthly budget status\n"
        "!memory <query>      Search memory notes\n"
        "!tools               List available tools\n"
        "!history [n]         Show last N conversation turns (default 5)\n"
        "!health              Check all subsystems\n"
        "!reload              Reload workspace files from disk\n"
        "!reset               End session and start fresh\n"
        "!sonnet <prompt>     Force Sonnet for this message\n"
        "```"
    )


def cmd_cost(budget: BudgetTracker) -> str:
    summary = budget.today_summary()
    if not summary:
        return ":white_check_mark: No API calls today yet — $0.00 spent."

    lines = [f"*Today's API spend ({datetime.now(timezone.utc).strftime('%Y-%m-%d')})*"]
    total = 0.0
    for model, stats in summary.items():
        cost = stats["cost_usd"]
        total += cost
        cache_read = stats["cache_read"]
        cache_write = stats["cache_written"]
        cache_total = cache_read + cache_write
        hit_pct = (cache_read / cache_total * 100) if cache_total > 0 else 0
        lines.append(
            f"• `{model}` — {stats['calls']} calls | "
            f"${cost:.5f} | "
            f"cache hit {hit_pct:.0f}%"
        )
    lines.append(f"*Total: ${total:.5f}*")
    return "\n".join(lines)


def cmd_budget(budget: BudgetTracker) -> str:
    status = budget.check()
    icon = ":no_entry:" if status.blocked else (":warning:" if status.warned else ":white_check_mark:")
    return f"{icon} *Budget Status*\n{status.summary()}"


def cmd_memory(query: str, store: MemoryStore) -> str:
    if not query:
        return "Usage: `!memory <search terms>`"
    results = store.search(query, limit=5)
    if not results:
        return f"No memory notes matching `{query}`."
    lines = [f"*Memory search: `{query}`*"]
    for r in results:
        tags = f" `{r['tags']}`" if r["tags"] else ""
        lines.append(f"• *{r['key']}*{tags}\n  {r['content'][:150]}")
    return "\n".join(lines)


def cmd_tools(registry: ToolRegistry) -> str:
    names = registry.names()
    if not names:
        return "No tools registered."
    lines = ["*Registered Tools*", "```"]
    for name in sorted(names):
        approval = "⚠ approval" if registry.approval_required(name) else "  auto"
        lines.append(f"{approval}  {name}")
    lines.append("```")
    return "\n".join(lines)


def cmd_history(session_id: str, history: ConversationHistory, n: int = 5) -> str:
    messages = history.get_messages(session_id)
    if not messages:
        return "No conversation history in this session."
    recent = messages[-n * 2:]  # n pairs
    lines = [f"*Last {len(recent)} messages*"]
    for msg in recent:
        role = "You" if msg["role"] == "user" else "IAN"
        preview = msg["content"][:120].replace("\n", " ")
        lines.append(f"*{role}:* {preview}")
    return "\n".join(lines)


def cmd_reload(project_root: Path, startup_files: list[str]) -> str:
    """Reload workspace files from disk and report sizes."""
    lines = ["*Reloaded workspace files:*"]
    total_chars = 0
    for filename in startup_files:
        path = project_root / filename
        if path.exists():
            size = len(path.read_text(encoding="utf-8"))
            total_chars += size
            lines.append(f"• `{filename}` — {size:,} chars")
        else:
            lines.append(f"• `{filename}` — :warning: not found")
    lines.append(f"Total startup context: {total_chars:,} chars (~{total_chars // 4:,} tokens)")
    return "\n".join(lines)


def cmd_health(
    cfg: Config,
    db_path: Path,
    haiku_client: Any,
) -> dict:
    """Run all subsystem checks and return a Block Kit status message."""
    checks: list[tuple[str, bool, str]] = []

    # 1. Slack API
    try:
        resp = haiku_client.auth_test()
        checks.append(("Slack API", True, resp.get("user", "ok")))
    except Exception as exc:
        checks.append(("Slack API", False, str(exc)[:80]))

    # 2. SQLite
    try:
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        conn.execute("SELECT COUNT(*) FROM budget_events").fetchone()
        conn.close()
        checks.append(("SQLite DB", True, str(db_path.name)))
    except Exception as exc:
        checks.append(("SQLite DB", False, str(exc)[:80]))

    # 3. Disk space
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        free_gb = free / (1024 ** 3)
        ok = free_gb > 1.0
        checks.append(("Disk space", ok, f"{free_gb:.1f} GB free"))
    except Exception as exc:
        checks.append(("Disk space", False, str(exc)[:80]))

    # 4. Budget
    try:
        from agent.budget_tracker import BudgetTracker
        bt = BudgetTracker(
            db_path,
            daily_limit=cfg.budget.daily_limit_usd,
            monthly_limit=cfg.budget.monthly_limit_usd,
        )
        status = bt.check()
        ok = not status.blocked
        detail = f"${status.daily_spent:.4f} / ${status.daily_limit:.2f} today"
        checks.append(("Budget", ok, detail))
    except Exception as exc:
        checks.append(("Budget", False, str(exc)[:80]))

    # 5. Memory markdown path
    try:
        md_path = cfg.memory.markdown_path
        ok = md_path.exists() and md_path.is_dir()
        checks.append(("Memory path", ok, str(md_path)))
    except Exception as exc:
        checks.append(("Memory path", False, str(exc)[:80]))

    all_ok = all(ok for _, ok, _ in checks)
    header = ":white_check_mark: All systems healthy" if all_ok else ":red_circle: Issues detected"

    fields = []
    for name, ok, detail in checks:
        icon = ":white_check_mark:" if ok else ":red_circle:"
        fields.append({"type": "mrkdwn", "text": f"{icon} *{name}*\n{detail}"})

    return {
        "blocks": [
            {"type": "header", "text": {"type": "plain_text", "text": f"IAN Health Check — {datetime.now(timezone.utc).strftime('%H:%M UTC')}"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": header}},
            {"type": "section", "fields": fields},
            {"type": "context", "elements": [{"type": "mrkdwn", "text": f"OS: {platform.system()} {platform.release()} | Python {platform.python_version()}"}]},
        ]
    }
