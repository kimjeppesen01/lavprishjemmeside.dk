"""
agent/claude_client.py — Anthropic API wrapper with prompt caching.

Responsibilities:
  - Single place where the Anthropic client is created
  - Injects cache_control on static system prompt blocks (SOUL.md, USER.md, IDENTITY.md)
  - Logs cache hit/miss metrics for budget verification
  - Exposes a simple chat() coroutine used by the dispatcher

Prompt caching (Day 6 verification target):
  - cache_creation_input_tokens → tokens written to cache (full price)
  - cache_read_input_tokens → tokens served from cache (90% discount)
  - Target: cache_read > cache_creation within 24h of launch
"""
from __future__ import annotations

import logging
from typing import Any

import anthropic

from agent.config import Config

logger = logging.getLogger(__name__)


class ClaudeClient:
    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg
        self._client = anthropic.Anthropic(api_key=cfg.anthropic.api_key)
        self._project_root = cfg.project_root

    # ------------------------------------------------------------------
    # System prompt construction
    # ------------------------------------------------------------------

    def _load_startup_file(self, filename: str) -> str | None:
        """Load a workspace file from the project root. Returns None if missing."""
        path = self._project_root / filename
        if path.exists():
            return path.read_text(encoding="utf-8")
        logger.debug("Startup file not found, skipping: %s", path)
        return None

    def _build_system_blocks(
        self, extra_context: str | None = None
    ) -> list[dict[str, Any]]:
        """
        Build system prompt blocks with cache_control on stable files.

        Returns a list of content blocks suitable for the 'system' parameter.
        Static files get cache_control so subsequent calls hit the 90% discount.
        """
        blocks: list[dict[str, Any]] = []

        # Load startup files (SOUL.md, USER.md, IDENTITY.md)
        for filename in self._cfg.memory.startup_files:
            content = self._load_startup_file(filename)
            if content:
                block: dict[str, Any] = {"type": "text", "text": content}
                if self._cfg.anthropic.prompt_cache_enabled:
                    # Mark stable files for caching (90% discount on reuse)
                    block["cache_control"] = {"type": "ephemeral"}
                blocks.append(block)

        # Dynamic context (today's daily note, memory snippets) — never cached
        if extra_context:
            blocks.append({"type": "text", "text": extra_context})

        # Fallback if all files are missing (e.g. first run before files are created)
        if not blocks:
            blocks.append(
                {
                    "type": "text",
                    "text": "You are a personal AI assistant. Be helpful and concise.",
                }
            )

        return blocks

    # ------------------------------------------------------------------
    # Core chat method
    # ------------------------------------------------------------------

    def chat(
        self,
        *,
        messages: list[dict[str, Any]],
        model: str | None = None,
        max_tokens: int | None = None,
        tools: list[dict[str, Any]] | None = None,
        extra_system_context: str | None = None,
    ) -> anthropic.types.Message:
        """
        Send a chat request to the Anthropic API.

        Args:
            messages: List of {"role": "user"|"assistant", "content": ...} dicts.
            model: Override model (default: cfg.anthropic.model_default).
            max_tokens: Override max tokens (default: cfg.anthropic.max_tokens).
            tools: Optional list of tool definitions for tool-use mode.
            extra_system_context: Dynamic text appended to system prompt (not cached).

        Returns:
            The raw anthropic.types.Message response.
        """
        resolved_model = model or self._cfg.anthropic.model_default
        resolved_max_tokens = max_tokens or self._cfg.anthropic.max_tokens
        system_blocks = self._build_system_blocks(extra_system_context)

        kwargs: dict[str, Any] = {
            "model": resolved_model,
            "max_tokens": resolved_max_tokens,
            "system": system_blocks,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        response = self._client.messages.create(**kwargs)

        # Log cache metrics so we can verify caching is working
        usage = response.usage
        cache_written = getattr(usage, "cache_creation_input_tokens", 0) or 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        input_tokens = usage.input_tokens
        output_tokens = usage.output_tokens

        logger.debug(
            "API call | model=%s | input=%d | output=%d | cache_written=%d | cache_read=%d",
            resolved_model,
            input_tokens,
            output_tokens,
            cache_written,
            cache_read,
        )

        if cache_written > 0:
            logger.debug("Cache write: %d tokens stored", cache_written)
        if cache_read > 0:
            logger.debug("Cache hit: %d tokens served at 90%% discount", cache_read)

        return response

    def extract_text(self, response: anthropic.types.Message) -> str:
        """Extract the first text block from a Message response."""
        for block in response.content:
            if block.type == "text":
                return block.text
        return ""
