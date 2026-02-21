"""
memory/summarizer.py — Compress long sessions into a short summary.

Triggered automatically when a session exceeds MEMORY_SUMMARIZE_AFTER_TURNS (default 20).

Strategy:
  1. Fetch all messages in the session
  2. Call Haiku (cheap) to produce a compact summary
  3. Store the summary in sessions.summary
  4. End the current session and start a fresh one
  5. Inject the summary as the first user message of the new session
     so context is preserved without the full history

This keeps the context window lean: after summarisation, the new session
starts with ~200 tokens of summary instead of 8000 tokens of history.
"""
from __future__ import annotations

import logging

from agent.claude_client import ClaudeClient
from agent.config import Config
from memory.history import ConversationHistory

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """\
You are a memory compressor. Summarise the conversation below into a concise
paragraph (max 150 words) that captures:
- The main topics discussed
- Any decisions made or tasks completed
- Outstanding action items or follow-ups
- Key facts learned about the user's projects or preferences

Output ONLY the summary paragraph. No preamble, no formatting.
"""


class SessionSummarizer:
    def __init__(self, cfg: Config, history: ConversationHistory, claude: ClaudeClient) -> None:
        self._cfg = cfg
        self._history = history
        self._claude = claude

    def should_summarize(self, session_id: str) -> bool:
        """Return True if the session has exceeded the turn limit."""
        turns = self._history.get_turn_count(session_id)
        return turns >= self._cfg.memory.summarize_after_turns

    def summarize_and_rotate(self, session_id: str, channel_id: str) -> str:
        """
        Summarise the current session, end it, and return a new session ID.

        The summary is:
          - Stored in the old session's `summary` column
          - Injected as the first user message in the new session

        Returns the new session_id.
        """
        logger.info("summarizer.start session=%s", session_id)

        # Fetch the full message history for summarisation
        messages = self._history.get_messages(session_id)
        if not messages:
            logger.warning("summarizer: no messages found for session %s", session_id)
            self._history.end_session(session_id)
            return self._history.get_or_create_session(channel_id)

        # Format conversation as a readable block for the model
        conversation_text = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in messages
        )
        prompt = f"{SUMMARY_PROMPT}\n\nCONVERSATION:\n{conversation_text}"

        # Use Haiku for summarisation — this is a cheap, mechanical task
        try:
            response = self._claude.chat(
                messages=[{"role": "user", "content": prompt}],
                model=self._cfg.anthropic.model_default,
                max_tokens=300,
            )
            summary = self._claude.extract_text(response)
        except Exception:
            logger.exception("summarizer: Claude call failed — using placeholder")
            summary = f"[Summary unavailable — session had {len(messages)} messages]"

        logger.info("summarizer.summary: %s...", summary[:80])

        # Store summary and end the old session
        self._history.save_summary(session_id, summary)
        self._history.end_session(session_id)

        # Start a fresh session with the summary injected as context
        new_session_id = self._history.get_or_create_session(channel_id)
        self._history.add_message(
            new_session_id,
            role="user",
            content=f"[Previous conversation summary]\n{summary}",
        )
        self._history.add_message(
            new_session_id,
            role="assistant",
            content="Understood. I have the context from our previous conversation.",
        )

        logger.info(
            "summarizer.rotate old=%s new=%s", session_id, new_session_id
        )
        return new_session_id
