"""
memory/history.py — Token-aware conversation history for multi-turn sessions.

Keeps the rolling message list within MEMORY_MAX_CONVERSATION_TOKENS (default 8000).
When the window fills up, oldest messages are trimmed first (never the most recent).

Uses tiktoken cl100k_base encoding to estimate token counts without an API call.
This is an approximation — Anthropic uses a similar but not identical tokeniser —
but it's accurate enough for windowing purposes and costs zero tokens.

Session lifecycle:
  1. handle() in slack/handlers.py calls history.get_or_create_session(channel)
  2. Each user message is appended with history.add_message(session_id, 'user', text)
  3. The trimmed message list is passed to ClaudeClient.chat(messages=...)
  4. The assistant reply is appended with history.add_message(session_id, 'assistant', reply)
"""
from __future__ import annotations

import logging
import sqlite3
import uuid
from pathlib import Path

import tiktoken

from memory.db import get_connection

logger = logging.getLogger(__name__)

# Tiktoken encoder — cl100k_base matches GPT-4 / Claude tokenisation closely enough
_ENCODER = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Estimate token count for a string using cl100k_base."""
    return len(_ENCODER.encode(text))


class ConversationHistory:
    def __init__(self, db_path: Path, max_tokens: int = 8000) -> None:
        self._db_path = db_path
        self._max_tokens = max_tokens

    def _conn(self) -> sqlite3.Connection:
        return get_connection(self._db_path)

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------

    def get_or_create_session(self, channel_id: str) -> str:
        """
        Return the active session ID for a channel, creating one if needed.

        A new session is created when:
          - No session exists for the channel
          - The existing session has ended (ended_at IS NOT NULL)
        """
        with self._conn() as conn:
            row = conn.execute(
                """
                SELECT id FROM sessions
                WHERE channel_id = ? AND ended_at IS NULL
                ORDER BY started_at DESC
                LIMIT 1
                """,
                (channel_id,),
            ).fetchone()

            if row:
                return row[0]

            session_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO sessions (id, channel_id) VALUES (?, ?)",
                (session_id, channel_id),
            )
            logger.info("history.new_session id=%s channel=%s", session_id, channel_id)
            return session_id

    def end_session(self, session_id: str) -> None:
        """Mark a session as ended."""
        with self._conn() as conn:
            conn.execute(
                "UPDATE sessions SET ended_at = datetime('now') WHERE id = ?",
                (session_id,),
            )

    def get_turn_count(self, session_id: str) -> int:
        """Return the number of turns (user+assistant pairs) in a session."""
        with self._conn() as conn:
            row = conn.execute(
                "SELECT turn_count FROM sessions WHERE id = ?", (session_id,)
            ).fetchone()
        return row[0] if row else 0

    # ------------------------------------------------------------------
    # Message storage
    # ------------------------------------------------------------------

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        model: str = "",
        input_tokens: int = 0,
        output_tokens: int = 0,
        cache_written: int = 0,
        cache_read: int = 0,
    ) -> None:
        """Persist a message and increment the session turn counter (on assistant turns)."""
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO messages
                    (session_id, role, content, model,
                     input_tokens, output_tokens, cache_written, cache_read)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (session_id, role, content, model,
                 input_tokens, output_tokens, cache_written, cache_read),
            )
            if role == "assistant":
                conn.execute(
                    "UPDATE sessions SET turn_count = turn_count + 1 WHERE id = ?",
                    (session_id,),
                )

    # ------------------------------------------------------------------
    # Context window building
    # ------------------------------------------------------------------

    def get_messages(self, session_id: str) -> list[dict]:
        """
        Return the trimmed message list for a session, within max_tokens.

        Algorithm:
          1. Fetch all messages newest-first
          2. Walk backwards (newest to oldest), accumulating token count
          3. Stop when adding the next message would exceed max_tokens
          4. Reverse to chronological order for the API call

        This always preserves the most recent messages and trims oldest ones.
        """
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT role, content FROM messages
                WHERE session_id = ?
                ORDER BY created_at DESC
                """,
                (session_id,),
            ).fetchall()

        # rows is newest-first; walk backwards to build window
        window: list[dict] = []
        total_tokens = 0

        for role, content in rows:
            tokens = count_tokens(content)
            if total_tokens + tokens > self._max_tokens and window:
                # Would exceed limit — stop (oldest messages are dropped)
                break
            window.append({"role": role, "content": content})
            total_tokens += tokens

        # Reverse to chronological order
        window.reverse()
        logger.debug(
            "history.get_messages session=%s messages=%d tokens=%d",
            session_id, len(window), total_tokens,
        )
        return window

    def save_summary(self, session_id: str, summary: str) -> None:
        """Store a compressed summary for the session (used by Day 11 summarizer)."""
        with self._conn() as conn:
            conn.execute(
                "UPDATE sessions SET summary = ? WHERE id = ?",
                (summary, session_id),
            )
