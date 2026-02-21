"""
audit/logger.py — JSONL transcript writer.

Every message in and out, every tool call, and every cost event is written
to a per-day JSONL file at audit/logs/transcripts/YYYY-MM-DD.jsonl.

Design rules:
  - One JSON object per line (standard JSONL format)
  - Never raises — logging failure must not crash the agent
  - Thread-safe (file lock per write)
  - Self-organises by date: new file each day automatically
"""
from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Valid event types for type-safe logging calls
EVENT_TYPES = frozenset(
    {
        "user_message",       # Incoming message from owner
        "agent_reply",        # Outgoing Claude response
        "tool_call",          # Tool execution request
        "tool_result",        # Tool execution result
        "model_selected",     # Which model was chosen and why
        "policy_decision",    # Fixed-environment policy gate decisions
        "cache_metrics",      # Cache hit/write token counts
        "cost_event",         # API call cost tracking
        "heartbeat",          # Periodic health check
        "error",              # Any error event
        "startup",            # Agent process start
        "shutdown",           # Agent process stop (best-effort)
    }
)


class AuditLogger:
    """JSONL audit logger with per-day file rotation."""

    def __init__(self, log_path: Path) -> None:
        self._transcripts_path = log_path / "transcripts"
        self._transcripts_path.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def _today_path(self) -> Path:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return self._transcripts_path / f"{date_str}.jsonl"

    def log(self, event_type: str, data: dict[str, Any]) -> None:
        """
        Write one event to today's JSONL transcript file.

        Args:
            event_type: One of the EVENT_TYPES strings.
            data: Any JSON-serialisable dict of event details.
        """
        if event_type not in EVENT_TYPES:
            logger.warning("Unknown audit event type: %s", event_type)

        record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "event": event_type,
            **data,
        }

        try:
            line = json.dumps(record, ensure_ascii=False, default=str) + "\n"
            with self._lock:
                with self._today_path().open("a", encoding="utf-8") as f:
                    f.write(line)
        except Exception:
            # Never let logging errors crash the agent
            logger.exception("Failed to write audit log record")

    # ------------------------------------------------------------------
    # Convenience methods for common events
    # ------------------------------------------------------------------

    def user_message(self, user_id: str, text: str, channel: str) -> None:
        self.log("user_message", {"user_id": user_id, "channel": channel, "text": text})

    def agent_reply(
        self,
        text: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cache_written: int = 0,
        cache_read: int = 0,
    ) -> None:
        self.log(
            "agent_reply",
            {
                "model": model,
                "text": text[:500],  # Truncate long replies in audit log
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cache_written": cache_written,
                "cache_read": cache_read,
            },
        )

    def tool_call(self, tool_name: str, inputs: dict[str, Any]) -> None:
        self.log("tool_call", {"tool": tool_name, "inputs": inputs})

    def tool_result(self, tool_name: str, success: bool, output: Any) -> None:
        self.log(
            "tool_result",
            {
                "tool": tool_name,
                "success": success,
                "output": str(output)[:500],
            },
        )

    def model_selected(self, model: str, reason: str, text_preview: str) -> None:
        self.log(
            "model_selected",
            {"model": model, "reason": reason, "text_preview": text_preview[:100]},
        )

    def policy_decision(
        self,
        *,
        intent: str,
        confidence: float,
        policy_decision: str,
        ticket_id: str | None,
        model_used: str,
        reason: str = "",
    ) -> None:
        self.log(
            "policy_decision",
            {
                "intent": intent,
                "confidence": round(confidence, 4),
                "policy_decision": policy_decision,
                "ticket_id": ticket_id or "",
                "model_used": model_used,
                "reason": reason,
            },
        )

    def cost_event(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cache_written: int,
        cache_read: int,
    ) -> None:
        """Log token usage so budget_tracker can compute running costs."""
        self.log(
            "cost_event",
            {
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cache_written": cache_written,
                "cache_read": cache_read,
            },
        )

    def heartbeat(self, ok: bool, details: dict[str, Any]) -> None:
        self.log("heartbeat", {"ok": ok, **details})

    def error(self, message: str, exc: Exception | None = None) -> None:
        data: dict[str, Any] = {"message": message}
        if exc:
            data["exception"] = type(exc).__name__
            data["detail"] = str(exc)
        self.log("error", data)

    def startup(self, version: str = "0.1.0", **kwargs: Any) -> None:
        self.log("startup", {"version": version, **kwargs})
