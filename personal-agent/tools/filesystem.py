"""
tools/filesystem.py — Safe file read and write tools.

Safety rules (enforced before any file operation):
  1. Path must be inside one of FS_SAFE_ROOTS
  2. Path must not match any FS_DENY_PATTERNS
  3. Writes require requires_approval = True

Both tools are constructed with the Config so they read safe roots and
deny patterns from environment variables — never hardcoded.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from agent.config import Config
from tools.base import BaseTool, ToolError


def _check_path(path: Path, cfg: Config) -> None:
    """
    Raise ToolError if the path violates safety rules.

    Checks:
      1. Path is inside at least one safe root (symlinks resolved)
      2. Path does not match any deny pattern
    """
    resolved = path.resolve()

    # Rule 1: must be inside a safe root
    in_safe_root = any(
        str(resolved).startswith(str(root.resolve()))
        for root in cfg.filesystem.safe_roots
    )
    if not in_safe_root:
        raise ToolError(
            f"Path outside safe roots: {resolved}. "
            f"Allowed roots: {[str(r) for r in cfg.filesystem.safe_roots]}"
        )

    # Rule 2: must not match deny patterns
    path_str = str(resolved)
    for pattern in cfg.filesystem.deny_patterns:
        if pattern in path_str:
            raise ToolError(f"Path matches deny pattern '{pattern}': {resolved}")


class FilesystemReadTool(BaseTool):
    """Read a file from an allowed path. No approval required."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "filesystem_read"

    @property
    def description(self) -> str:
        return (
            "Read the contents of a file. Path must be inside the allowed "
            "safe roots and must not match any deny patterns."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Absolute path to the file to read.",
                },
                "max_lines": {
                    "type": "integer",
                    "description": "Maximum lines to return (default: 500). Use to avoid huge files.",
                    "default": 500,
                },
            },
            "required": ["path"],
        }

    @property
    def requires_approval(self) -> bool:
        return False

    def run(self, inputs: dict[str, Any]) -> str:
        path = Path(inputs["path"])
        max_lines: int = inputs.get("max_lines", 500)

        _check_path(path, self._cfg)

        if not path.exists():
            raise ToolError(f"File not found: {path}")
        if not path.is_file():
            raise ToolError(f"Path is not a file: {path}")

        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        total = len(lines)
        truncated = lines[:max_lines]
        result = "\n".join(truncated)

        if total > max_lines:
            result += f"\n\n[Truncated: showing {max_lines}/{total} lines]"

        return result


class FilesystemWriteTool(BaseTool):
    """Write or overwrite a file. Requires Slack approval."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "filesystem_write"

    @property
    def description(self) -> str:
        return (
            "Write content to a file. Creates the file and any parent directories "
            "if they don't exist. Requires approval before executing."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Absolute path to the file to write.",
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file.",
                },
            },
            "required": ["path", "content"],
        }

    @property
    def requires_approval(self) -> bool:
        return True

    def run(self, inputs: dict[str, Any]) -> str:
        path = Path(inputs["path"])
        content: str = inputs["content"]

        _check_path(path, self._cfg)

        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return f"Written {len(content)} chars to {path}"


class FilesystemListTool(BaseTool):
    """List files in a directory. No approval required."""

    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg

    @property
    def name(self) -> str:
        return "filesystem_list"

    @property
    def description(self) -> str:
        return "List files and directories at a given path."

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Absolute path to the directory to list.",
                },
                "pattern": {
                    "type": "string",
                    "description": "Optional glob pattern (e.g. '*.py'). Default: '*'.",
                    "default": "*",
                },
            },
            "required": ["path"],
        }

    @property
    def requires_approval(self) -> bool:
        return False

    def run(self, inputs: dict[str, Any]) -> str:
        path = Path(inputs["path"])
        pattern: str = inputs.get("pattern", "*")

        _check_path(path, self._cfg)

        if not path.exists():
            raise ToolError(f"Path not found: {path}")
        if not path.is_dir():
            raise ToolError(f"Path is not a directory: {path}")

        entries = sorted(path.glob(pattern))
        lines = []
        for entry in entries[:200]:
            kind = "dir" if entry.is_dir() else "file"
            lines.append(f"{kind}  {entry.name}")

        if not lines:
            return f"No files matching '{pattern}' in {path}"

        result = f"{path}\n" + "\n".join(lines)
        if len(entries) > 200:
            result += f"\n[Truncated: showing 200/{len(entries)} entries]"
        return result
