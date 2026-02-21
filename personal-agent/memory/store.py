"""
memory/store.py — Read/write/search interface for agent memory.

Two layers:
  1. SQLite FTS5 (memory_notes table) — fast keyword search, zero API cost
  2. Markdown files (memory/markdown/) — human-readable, git-friendly notes

Search always uses FTS5. Raw markdown files are never passed to the model
for searching — that would waste tokens and defeat the purpose of indexing.
"""
from __future__ import annotations

import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from memory.db import get_connection

logger = logging.getLogger(__name__)


class MemoryStore:
    def __init__(self, db_path: Path, markdown_path: Path) -> None:
        self._db_path = db_path
        self._markdown_path = markdown_path
        self._markdown_path.mkdir(parents=True, exist_ok=True)

    def _conn(self) -> sqlite3.Connection:
        return get_connection(self._db_path)

    # ------------------------------------------------------------------
    # FTS5 notes — structured memory facts
    # ------------------------------------------------------------------

    def save_note(self, key: str, content: str, tags: str = "") -> None:
        """
        Upsert a memory note by key.

        Key is unique — saving with the same key overwrites the previous note.
        Tags are comma-separated strings used for filtering (e.g. "project,card-pulse").
        """
        with self._conn() as conn:
            # FTS5 doesn't support UPDATE — delete then insert
            conn.execute("DELETE FROM memory_notes WHERE key = ?", (key,))
            conn.execute(
                "INSERT INTO memory_notes(key, content, tags) VALUES (?, ?, ?)",
                (key, content, tags),
            )
        logger.debug("memory.save_note key=%s", key)

    def search(self, query: str, limit: int = 5) -> list[dict]:
        """
        Full-text search across all memory notes using FTS5 porter stemmer.

        Returns list of dicts with 'key', 'content', 'tags' — ranked by relevance.
        Never calls the API. Zero cost.

        Args:
            query: Plain English search terms (FTS5 handles stemming/tokenisation)
            limit: Max results to return
        """
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT key, content, tags
                FROM memory_notes
                WHERE memory_notes MATCH ?
                ORDER BY rank
                LIMIT ?
                """,
                (query, limit),
            ).fetchall()
        return [{"key": r[0], "content": r[1], "tags": r[2]} for r in rows]

    def get_note(self, key: str) -> str | None:
        """Retrieve a single note by exact key. Returns None if not found."""
        with self._conn() as conn:
            row = conn.execute(
                "SELECT content FROM memory_notes WHERE key = ?", (key,)
            ).fetchone()
        return row[0] if row else None

    def delete_note(self, key: str) -> bool:
        """Delete a note by key. Returns True if it existed."""
        with self._conn() as conn:
            cur = conn.execute("DELETE FROM memory_notes WHERE key = ?", (key,))
        return cur.rowcount > 0

    # ------------------------------------------------------------------
    # Markdown files — daily notes + workspace files
    # ------------------------------------------------------------------

    def read_file(self, filename: str) -> str | None:
        """
        Read a markdown file from the memory directory.

        Args:
            filename: Relative path within memory/markdown/ (e.g. "SOUL.md",
                      "daily/2026-02-18.md")
        Returns:
            File contents as string, or None if not found.
        """
        path = self._markdown_path / filename
        if not path.exists():
            return None
        return path.read_text(encoding="utf-8")

    def write_file(self, filename: str, content: str) -> None:
        """Write or overwrite a markdown file in the memory directory."""
        path = self._markdown_path / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        logger.debug("memory.write_file %s", filename)

    def append_to_daily(self, text: str) -> str:
        """
        Append a timestamped entry to today's daily note.

        Creates the file if it doesn't exist.
        Returns the filename written.
        """
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        filename = f"daily/{today}.md"
        path = self._markdown_path / filename
        path.parent.mkdir(parents=True, exist_ok=True)

        ts = datetime.now(timezone.utc).strftime("%H:%M UTC")
        entry = f"\n## {ts}\n{text}\n"

        with path.open("a", encoding="utf-8") as f:
            f.write(entry)

        return filename

    def today_note(self) -> str | None:
        """Return today's daily note content, or None if it doesn't exist yet."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return self.read_file(f"daily/{today}.md")

    def list_notes(self, tag_filter: str = "") -> list[str]:
        """List all note keys, optionally filtered by tag."""
        with self._conn() as conn:
            if tag_filter:
                rows = conn.execute(
                    "SELECT key FROM memory_notes WHERE tags LIKE ?",
                    (f"%{tag_filter}%",),
                ).fetchall()
            else:
                rows = conn.execute("SELECT key FROM memory_notes").fetchall()
        return [r[0] for r in rows]
