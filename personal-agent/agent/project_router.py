"""
agent/project_router.py — Inject relevant project context into Claude's system prompt.

When a message mentions a known project, the router loads that project's
context file from projects/ and injects it as dynamic system context.
This keeps the startup context lean (only SOUL+USER+IDENTITY) while
still giving Claude rich per-project context on demand.

Project files live at projects/<name>.md — plain markdown with:
  - Tech stack
  - Current status
  - Key file paths
  - Recent decisions
  - Open issues
"""
from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Map of keyword → project markdown filename
# Keywords are checked as case-insensitive substrings of the message
PROJECT_KEYWORDS: dict[str, str] = {
    "card-pulse": "card_pulse.md",
    "card pulse": "card_pulse.md",
    "cardpulse": "card_pulse.md",
    "ai-clarity": "ai_clarity.md",
    "ai clarity": "ai_clarity.md",
    "aiclarity": "ai_clarity.md",
    "artisan": "the_artisan.md",
    "the-artisan": "the_artisan.md",
    "personal-agent": "personal_agent.md",
    "ian": "personal_agent.md",
    "lavpris": "lavprishjemmeside.md",
    "lavprishjemmeside": "lavprishjemmeside.md",
}


class ProjectRouter:
    def __init__(self, projects_path: Path) -> None:
        self._projects_path = projects_path
        self._projects_path.mkdir(parents=True, exist_ok=True)
        self._create_default_files()

    def _create_default_files(self) -> None:
        """Create placeholder project files if they don't exist."""
        defaults = {
            "card_pulse.md": "# card-pulse\n\n_Add project context here._\n",
            "ai_clarity.md": "# ai-clarity\n\n_Add project context here._\n",
            "the_artisan.md": "# The Artisan\n\n_Add project context here._\n",
            "personal_agent.md": "# Personal Agent (IAN)\n\nThis is IAN — the personal AI agent being built.\nStack: Python 3.12, slack-sdk, anthropic, SQLite FTS5, Playwright.\n",
        }
        for filename, content in defaults.items():
            path = self._projects_path / filename
            if not path.exists():
                path.write_text(content, encoding="utf-8")

    def detect_project(self, text: str) -> str | None:
        """
        Return the project filename if the message references a known project.
        Returns None if no project is detected.
        """
        lower = text.lower()
        for keyword, filename in PROJECT_KEYWORDS.items():
            if keyword in lower:
                logger.debug("project_router: detected '%s' → %s", keyword, filename)
                return filename
        return None

    def get_context(self, text: str) -> str | None:
        """
        Return the project context markdown if a project is mentioned.
        Returns None if no project detected or file missing.
        """
        filename = self.detect_project(text)
        if not filename:
            return None

        path = self._projects_path / filename
        if not path.exists():
            return None

        content = path.read_text(encoding="utf-8")
        logger.info("project_router: injecting context from %s (%d chars)", filename, len(content))
        return f"[Project Context — {filename}]\n{content}"

    def update_project(self, filename: str, content: str) -> None:
        """Write or overwrite a project context file."""
        path = self._projects_path / filename
        path.write_text(content, encoding="utf-8")
        logger.info("project_router: updated %s", filename)
