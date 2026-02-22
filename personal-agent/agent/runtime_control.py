"""
agent/runtime_control.py — IAN runtime ON/OFF control + heartbeat + assignment events.

Polls /master/ian-control (API key) and exposes a local enabled/disabled state.
Provides helpers to push work-state transitions and assignment deltas to the CMS API.
"""
from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Any

import httpx

from agent.config import Config
from audit.logger import AuditLogger

logger = logging.getLogger(__name__)


@dataclass
class ControlState:
    enabled: bool = True
    desired_state: str = "on"
    updated_at: str | None = None
    note: str | None = None


class RuntimeControl:
    def __init__(self, cfg: Config, audit: AuditLogger | None = None) -> None:
        self._cfg = cfg
        self._audit = audit
        self._state = ControlState(enabled=True, desired_state="on")
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._client = httpx.Client(timeout=10)

    @property
    def api_base(self) -> str:
        return self._cfg.kanban.api_url.rstrip("/")

    def start(self) -> None:
        if not self._cfg.ian_control.sync_enabled:
            logger.info("runtime_control disabled via config")
            return
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run_loop, name="ian-runtime-control", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)
        self._client.close()

    def is_enabled(self) -> bool:
        with self._lock:
            return bool(self._state.enabled)

    def state(self) -> ControlState:
        with self._lock:
            return ControlState(
                enabled=self._state.enabled,
                desired_state=self._state.desired_state,
                updated_at=self._state.updated_at,
                note=self._state.note,
            )

    def _headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-api-key": self._cfg.kanban.api_key,
        }

    def refresh_control(self) -> ControlState:
        if not self._cfg.kanban.api_key:
            return self.state()
        try:
            r = self._client.get(f"{self.api_base}/master/ian-control", headers=self._headers())
            r.raise_for_status()
            data = r.json()
            with self._lock:
                self._state.enabled = bool(data.get("enabled", True))
                self._state.desired_state = str(data.get("desired_state", "on"))
                self._state.updated_at = data.get("updated_at")
                self._state.note = data.get("note")
            return self.state()
        except Exception as exc:
            logger.warning("runtime_control.refresh_failed: %s", exc)
            return self.state()

    def heartbeat(
        self,
        *,
        agent_type: str,
        work_state: str,
        current_task: str | None = None,
        messages_sent_today: int | None = None,
        tokens_used_today: int | None = None,
        cost_usd_today: float | None = None,
        assignments_completed_today: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not self._cfg.kanban.api_key:
            return
        body: dict[str, Any] = {
            "agent_type": agent_type,
            "work_state": work_state,
            "status": "busy" if work_state == "operating" else ("offline" if work_state == "off" else "online"),
            "current_task": current_task,
            "metadata": metadata or {},
        }
        if messages_sent_today is not None:
            body["messages_sent_today"] = messages_sent_today
        if tokens_used_today is not None:
            body["tokens_used_today"] = tokens_used_today
        if cost_usd_today is not None:
            body["cost_usd_today"] = cost_usd_today
        if assignments_completed_today is not None:
            body["assignments_completed_today"] = assignments_completed_today
        try:
            self._client.post(f"{self.api_base}/master/ian-heartbeat", json=body, headers=self._headers()).raise_for_status()
        except Exception as exc:
            logger.warning("runtime_control.heartbeat_failed agent=%s: %s", agent_type, exc)

    def mark_operating(self, *, agent_type: str, current_task: str) -> None:
        self.heartbeat(agent_type=agent_type, work_state="operating", current_task=current_task)

    def mark_idle(self, *, agent_type: str) -> None:
        self.heartbeat(agent_type=agent_type, work_state="idle", current_task=None)

    def assignment_complete(
        self,
        *,
        agent_type: str,
        assignment_type: str,
        ticket_id: str | None,
        tokens_delta: int,
        cost_delta_usd: float,
        messages_delta: int,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not self._cfg.kanban.api_key:
            return
        body = {
            "agent_type": agent_type,
            "ticket_id": ticket_id,
            "assignment_type": assignment_type,
            "tokens_delta": int(tokens_delta or 0),
            "cost_delta_usd": float(cost_delta_usd or 0.0),
            "messages_delta": int(messages_delta or 0),
            "metadata": metadata or {},
        }
        try:
            self._client.post(f"{self.api_base}/master/ian-assignment-complete", json=body, headers=self._headers()).raise_for_status()
            self.mark_idle(agent_type=agent_type)
        except Exception as exc:
            logger.warning("runtime_control.assignment_complete_failed agent=%s: %s", agent_type, exc)

    def _run_loop(self) -> None:
        logger.info("runtime_control.loop_started poll=%ss", self._cfg.ian_control.poll_seconds)
        while not self._stop.is_set():
            state = self.refresh_control()
            if state.enabled:
                self.heartbeat(agent_type="ian", work_state="idle", current_task=None, metadata={"source": "runtime_control_poll"})
            else:
                self.heartbeat(agent_type="ian", work_state="off", current_task=None, metadata={"source": "runtime_control_poll"})
            self._stop.wait(self._cfg.ian_control.poll_seconds)
        logger.info("runtime_control.loop_stopped")
