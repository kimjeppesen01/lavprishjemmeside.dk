"""
tools/shell.py — Shell command execution with mandatory Slack approval.

Safety rules:
  1. requires_approval = True — always sends an Approve/Reject button first
  2. Blocked commands list checked before execution
  3. Configurable timeout (default 30s)
  4. stdout + stderr both captured and returned

The approval gate is enforced by the handler (slack/handlers.py) which
checks tool.requires_approval and blocks execution until the user clicks
Approve in Slack. This tool itself just runs the command when called.
"""
from __future__ import annotations

import subprocess
from typing import Any

from agent.config import Config
from tools.base import BaseTool, ToolError


class ShellTool(BaseTool):
    """Run a shell command. Always requires Slack approval."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "shell_run"

    @property
    def description(self) -> str:
        return (
            "Run a shell command on the Mac and return stdout + stderr. "
            "Always requires explicit approval before executing. "
            "Use for git operations, npm/pip installs, file operations, etc."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to run.",
                },
                "working_dir": {
                    "type": "string",
                    "description": "Working directory for the command. Defaults to project root.",
                },
            },
            "required": ["command"],
        }

    @property
    def requires_approval(self) -> bool:
        return True

    def run(self, inputs: dict[str, Any]) -> str:
        command: str = inputs["command"].strip()
        working_dir: str | None = inputs.get("working_dir")

        # Check blocked commands
        for blocked in self._cfg.shell.blocked_commands:
            if blocked.lower() in command.lower():
                raise ToolError(
                    f"Command contains blocked pattern '{blocked}'. "
                    "If you really need this, ask Sam to run it manually."
                )

        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=self._cfg.shell.timeout_seconds,
                cwd=working_dir,
            )
        except subprocess.TimeoutExpired as exc:
            raise ToolError(
                f"Command timed out after {self._cfg.shell.timeout_seconds}s: {command}"
            ) from exc
        except Exception as exc:
            raise ToolError(f"Failed to run command: {exc}") from exc

        output = ""
        if result.stdout:
            output += result.stdout
        if result.stderr:
            output += f"\n[stderr]\n{result.stderr}"
        if result.returncode != 0:
            output += f"\n[exit code: {result.returncode}]"

        return output.strip() or "(no output)"
