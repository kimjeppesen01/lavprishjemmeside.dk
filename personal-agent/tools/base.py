"""
tools/base.py — BaseTool ABC and ToolRegistry.

Every tool the agent can call must subclass BaseTool and implement:
  - name: str              — unique identifier ("filesystem.read", "shell.run")
  - description: str       — shown to Claude in the tool definition
  - input_schema: dict     — JSON Schema for the tool's input parameters
  - requires_approval: bool — if True, a Slack Approve/Reject button is sent
                              before the tool runs
  - run(inputs: dict) -> str — executes the tool and returns a string result

The ToolRegistry auto-discovers all registered tools and builds the
tool_definitions list passed to ClaudeClient.chat(tools=...).
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class BaseTool(ABC):
    """Abstract base class for all agent tools."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique dot-namespaced tool identifier, e.g. 'filesystem.read'."""

    @property
    @abstractmethod
    def description(self) -> str:
        """One-sentence description shown to Claude in the tool definition."""

    @property
    @abstractmethod
    def input_schema(self) -> dict[str, Any]:
        """JSON Schema object describing the tool's input parameters."""

    @property
    def requires_approval(self) -> bool:
        """
        If True, the agent sends a Slack Approve/Reject button before running.
        Default: False. Override to True for destructive or irreversible tools.
        """
        return False

    @abstractmethod
    def run(self, inputs: dict[str, Any]) -> str:
        """
        Execute the tool with the given inputs.

        Args:
            inputs: Dict matching the tool's input_schema.

        Returns:
            String result to be returned to Claude as the tool_result.

        Raises:
            ToolError: For expected tool failures (bad path, denied command, etc.)
            Exception: Unexpected errors — caller logs and returns error string.
        """

    def to_api_definition(self) -> dict[str, Any]:
        """Return the tool definition dict for the Anthropic API."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }


class ToolError(Exception):
    """Expected tool failure — wrong input, permission denied, etc."""


class ToolRegistry:
    """
    Central registry for all available tools.

    Usage:
        registry = ToolRegistry()
        registry.register(FilesystemReadTool(cfg))
        registry.register(ShellTool(cfg))

        # Get Anthropic API definitions
        tool_defs = registry.get_definitions()

        # Execute a tool call from Claude
        result = registry.execute("filesystem.read", {"path": "/foo/bar.txt"})
    """

    def __init__(self) -> None:
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance. Raises if name is already registered."""
        if tool.name in self._tools:
            raise ValueError(f"Tool already registered: {tool.name!r}")
        self._tools[tool.name] = tool
        logger.debug("tool.register name=%s approval=%s", tool.name, tool.requires_approval)

    def get(self, name: str) -> BaseTool | None:
        """Return a tool by name, or None if not found."""
        return self._tools.get(name)

    def get_definitions(self) -> list[dict[str, Any]]:
        """Return all tool definitions for the Anthropic API."""
        return [t.to_api_definition() for t in self._tools.values()]

    def execute(self, name: str, inputs: dict[str, Any]) -> str:
        """
        Run a tool by name. Returns the result string.

        Catches ToolError and unexpected exceptions — never raises.
        """
        tool = self._tools.get(name)
        if not tool:
            return f"Error: unknown tool '{name}'"

        try:
            result = tool.run(inputs)
            logger.info("tool.run name=%s ok", name)
            return result
        except ToolError as exc:
            logger.warning("tool.run name=%s tool_error=%s", name, exc)
            return f"Tool error: {exc}"
        except Exception as exc:
            logger.exception("tool.run name=%s unexpected_error", name)
            return f"Unexpected error: {exc}"

    def names(self) -> list[str]:
        """List all registered tool names."""
        return list(self._tools.keys())

    def approval_required(self, name: str) -> bool:
        """Return True if the named tool requires Slack approval before running."""
        tool = self._tools.get(name)
        return tool.requires_approval if tool else False
