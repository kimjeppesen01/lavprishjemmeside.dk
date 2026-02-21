"""
agent/scheduler.py — APScheduler-based cron for heartbeat + daily briefing.

Jobs:
  heartbeat   — Every N hours: Slack API ping + SQLite read + log write.
                Pure Python. Zero API tokens. Zero cost.
  briefing    — Weekdays 8am Copenhagen time: Claude Haiku generates a
                short daily summary (today's calendar + memory notes).
  digest      — Monday 9am: Weekly project digest.

The scheduler runs on a background thread. The main thread is the Slack
poll loop. Both share the same Config and clients.

Heartbeat implementation:
  1. Call Slack auth.test() with the haiku_client
  2. Read one row from SQLite (proves DB is healthy)
  3. Write a heartbeat record to the audit log
  No model call. No API cost. If it fails, post an alert to the channel.
"""
from __future__ import annotations

import logging
import sqlite3
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from agent.config import Config
from audit.logger import AuditLogger

logger = logging.getLogger(__name__)


class AgentScheduler:
    def __init__(
        self,
        cfg: Config,
        haiku_client: WebClient,
        db_path: Path,
        audit: AuditLogger,
    ) -> None:
        self._cfg = cfg
        self._client = haiku_client
        self._db_path = db_path
        self._audit = audit
        self._scheduler = BackgroundScheduler(timezone=cfg.agent.timezone)

    def start(self) -> None:
        """Register all jobs and start the background scheduler."""
        if not self._cfg.scheduler.enabled:
            logger.info("scheduler: disabled via config")
            return

        # Heartbeat — pure Python ping, every N hours
        self._scheduler.add_job(
            self._heartbeat,
            "interval",
            hours=self._cfg.heartbeat.interval_hours,
            id="heartbeat",
            replace_existing=True,
        )

        # Daily briefing — weekdays at configured cron time
        briefing_parts = self._cfg.scheduler.daily_briefing_cron.split()
        if len(briefing_parts) == 5:
            minute, hour, day, month, day_of_week = briefing_parts
            self._scheduler.add_job(
                self._daily_briefing,
                CronTrigger(
                    minute=minute, hour=hour, day=day,
                    month=month, day_of_week=day_of_week,
                    timezone=self._cfg.agent.timezone,
                ),
                id="daily_briefing",
                replace_existing=True,
            )

        # Weekly digest — Monday morning
        digest_parts = self._cfg.scheduler.weekly_digest_cron.split()
        if len(digest_parts) == 5:
            minute, hour, day, month, day_of_week = digest_parts
            self._scheduler.add_job(
                self._weekly_digest,
                CronTrigger(
                    minute=minute, hour=hour, day=day,
                    month=month, day_of_week=day_of_week,
                    timezone=self._cfg.agent.timezone,
                ),
                id="weekly_digest",
                replace_existing=True,
            )

        # Nightly backup at 2am
        self._scheduler.add_job(
            self._nightly_backup,
            CronTrigger(hour=2, minute=0, timezone=self._cfg.agent.timezone),
            id="nightly_backup",
            replace_existing=True,
        )

        self._scheduler.start()
        logger.info(
            "scheduler.started | heartbeat=%dh | briefing=%s | digest=%s",
            self._cfg.heartbeat.interval_hours,
            self._cfg.scheduler.daily_briefing_cron,
            self._cfg.scheduler.weekly_digest_cron,
        )

    def stop(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    # ------------------------------------------------------------------
    # Job implementations
    # ------------------------------------------------------------------

    def _heartbeat(self) -> None:
        """
        Pure Python health check — no model, no API cost.

        Checks:
          1. Slack API reachable (auth.test)
          2. SQLite readable (SELECT 1)
          3. Writes to audit log
        """
        ok = True
        details: dict = {"ts": datetime.now().isoformat()}

        # Slack ping
        try:
            resp = self._client.auth_test()
            details["slack"] = resp.get("user", "ok")
        except SlackApiError as exc:
            logger.error("heartbeat: Slack ping failed: %s", exc)
            details["slack"] = f"ERROR: {exc}"
            ok = False

        # SQLite read
        try:
            conn = sqlite3.connect(str(self._db_path))
            conn.execute("SELECT 1").fetchone()
            conn.close()
            details["db"] = "ok"
        except Exception as exc:
            logger.error("heartbeat: DB read failed: %s", exc)
            details["db"] = f"ERROR: {exc}"
            ok = False

        self._audit.heartbeat(ok, details)

        if not ok:
            try:
                self._client.chat_postMessage(
                    channel=self._cfg.slack.control_channel_id,
                    text=f":red_circle: IAN heartbeat failed: {details}",
                )
            except Exception:
                logger.exception("heartbeat: failed to post alert")

        logger.info("heartbeat ok=%s %s", ok, details)

    def _daily_briefing(self) -> None:
        """Post a morning briefing via Haiku (cheapest model)."""
        from agent.claude_client import ClaudeClient
        from memory.store import MemoryStore

        claude = ClaudeClient(self._cfg)
        store = MemoryStore(self._db_path, self._cfg.memory.markdown_path)

        today = datetime.now().strftime("%A, %B %d %Y")
        daily_note = store.today_note() or "No notes yet today."
        recent_notes = store.search("project status", limit=3)
        notes_text = "\n".join(f"- {n['content'][:100]}" for n in recent_notes)

        prompt = (
            f"Today is {today}. Write a short morning briefing for Sam (3-5 bullet points).\n"
            f"Today's notes: {daily_note[:500]}\n"
            f"Recent memory: {notes_text}\n"
            "Be concise and actionable."
        )

        try:
            response = claude.chat(
                messages=[{"role": "user", "content": prompt}],
                model=self._cfg.anthropic.model_default,
                max_tokens=300,
            )
            briefing = claude.extract_text(response)
            self._client.chat_postMessage(
                channel=self._cfg.slack.control_channel_id,
                text=f":sunrise: *Good morning, Sam!*\n{briefing}",
            )
        except Exception:
            logger.exception("daily_briefing: failed")

    def _nightly_backup(self) -> None:
        """Copy agent.db and memory/markdown to BACKUPS directory."""
        import shutil
        from pathlib import Path

        backup_root = Path.home() / "Samlino" / "BACKUPS" / "personal-agent"
        ts = datetime.now().strftime("%Y-%m-%d")
        dest = backup_root / ts
        dest.mkdir(parents=True, exist_ok=True)

        try:
            shutil.copy2(self._db_path, dest / "agent.db")
            md_src = self._cfg.memory.markdown_path
            md_dest = dest / "markdown"
            if md_dest.exists():
                shutil.rmtree(md_dest)
            shutil.copytree(md_src, md_dest)
            logger.info("backup.ok dest=%s", dest)

            # Prune backups older than 30 days
            cutoff = datetime.now().timestamp() - 30 * 86400
            for d in backup_root.iterdir():
                if d.is_dir() and d.stat().st_mtime < cutoff:
                    shutil.rmtree(d)
                    logger.info("backup.pruned %s", d)
        except Exception:
            logger.exception("backup.failed")

    def _weekly_digest(self) -> None:
        """Post a Monday morning weekly digest via Haiku."""
        from agent.claude_client import ClaudeClient

        claude = ClaudeClient(self._cfg)
        prompt = (
            "Write a brief weekly digest for Sam (3-5 bullets).\n"
            "Cover: what was accomplished, what's next, any blockers.\n"
            "Be concise."
        )

        try:
            response = claude.chat(
                messages=[{"role": "user", "content": prompt}],
                model=self._cfg.anthropic.model_default,
                max_tokens=300,
            )
            digest = claude.extract_text(response)
            self._client.chat_postMessage(
                channel=self._cfg.slack.control_channel_id,
                text=f":calendar: *Weekly Digest*\n{digest}",
            )
        except Exception:
            logger.exception("weekly_digest: failed")
