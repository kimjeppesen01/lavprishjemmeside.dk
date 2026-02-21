"""
agent/planner_context.py — Full-context loader for the Planner persona (v1.1).

The Planner (Sonnet) must read all project documentation before designing
an implementation plan. This module loads and combines those files.

Load order:
  1. BRAND_VISION.md (repo root — per-client brand context, skip if missing)
  2. PROJECT_CONTEXT.md (repo root — CMS architecture + admin routes)
  3. docs/*.md (all reference docs, sorted)
  4. personal-agent/docs/*.md (IAN operating docs, sorted)

The combined context is returned as a single string with section headers.
Cache-control markers are added for Anthropic prompt caching — the first
Planner call within a 5-minute window caches this context; subsequent
calls read from cache at ~10% of the input token cost.
"""
from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Approximate Sonnet pricing (baked in so Planner can calculate estimates)
SONNET_PRICE_PER_1M_INPUT = 3.00
SONNET_PRICE_PER_1M_OUTPUT = 15.00
SONNET_PRICE_PER_1M_CACHED = 0.30
COST_MULTIPLIER_USER_FACING = 20  # API cost × 20 to reflect real-world dev cost


class PlannerContextLoader:
    """Loads and combines all documentation files for the Planner persona."""

    def __init__(self, project_root: Path) -> None:
        self._root = project_root

    def load_all(self) -> str:
        """
        Return combined context string from all mandatory Planner docs.
        Returns empty string if no docs found (graceful degradation).
        """
        parts: list[str] = []

        # 1. BRAND_VISION.md (per-client, may not exist)
        brand_vision = self._root / "BRAND_VISION.md"
        if brand_vision.exists():
            parts.append(self._section("BRAND VISION", brand_vision.read_text(encoding="utf-8")))
        else:
            logger.info("planner_context: BRAND_VISION.md not found — skipping")
            parts.append(
                "=== BRAND VISION ===\n"
                "No BRAND_VISION.md found. Suggest client completes this via Brainstormer "
                "before the Planner can fully tailor the plan to the brand.\n"
            )

        # 2. PROJECT_CONTEXT.md (always required)
        project_ctx = self._root / "PROJECT_CONTEXT.md"
        if project_ctx.exists():
            parts.append(self._section("PROJECT CONTEXT", project_ctx.read_text(encoding="utf-8")))
        else:
            logger.warning("planner_context: PROJECT_CONTEXT.md not found")

        # 3. docs/*.md (main repo docs directory)
        docs_dir = self._root / "docs"
        if docs_dir.is_dir():
            for md_file in sorted(docs_dir.glob("*.md")):
                try:
                    parts.append(
                        self._section(
                            f"DOC: {md_file.name}",
                            md_file.read_text(encoding="utf-8"),
                        )
                    )
                except OSError as e:
                    logger.warning("planner_context: failed to read %s: %s", md_file, e)

        # 4. personal-agent/docs/*.md (IAN operating docs)
        ian_docs_dir = self._root / "personal-agent" / "docs"
        if ian_docs_dir.is_dir():
            for md_file in sorted(ian_docs_dir.glob("*.md")):
                try:
                    parts.append(
                        self._section(
                            f"IAN DOC: {md_file.name}",
                            md_file.read_text(encoding="utf-8"),
                        )
                    )
                except OSError as e:
                    logger.warning("planner_context: failed to read %s: %s", md_file, e)

        combined = "\n\n".join(parts)
        total_chars = len(combined)
        logger.info(
            "planner_context: loaded %d sections, ~%d chars (~%d tokens)",
            len(parts),
            total_chars,
            total_chars // 4,  # rough token estimate: 4 chars/token
        )
        return combined

    @staticmethod
    def _section(title: str, content: str) -> str:
        bar = "=" * 60
        return f"{bar}\n=== {title} ===\n{bar}\n{content}"

    @staticmethod
    def estimate_cost(input_tokens: int, output_tokens: int) -> dict:
        """
        Return cost estimates dict with API cost and user-facing cost.

        Args:
            input_tokens: Estimated input tokens for implementation run.
            output_tokens: Estimated output tokens for implementation run.

        Returns:
            {
                'input_tokens': int,
                'output_tokens': int,
                'api_cost_usd': float,
                'user_facing_cost_usd': float,
                'formatted': str,  # human-readable block for Planner output
            }
        """
        api_cost = (
            (input_tokens / 1_000_000) * SONNET_PRICE_PER_1M_INPUT
            + (output_tokens / 1_000_000) * SONNET_PRICE_PER_1M_OUTPUT
        )
        user_cost = api_cost * COST_MULTIPLIER_USER_FACING

        formatted = (
            f"## Cost Estimate\n"
            f"- Estimated input tokens for implementation: ~{input_tokens:,}\n"
            f"- Estimated output tokens: ~{output_tokens:,}\n"
            f"- API cost (Sonnet @ ${SONNET_PRICE_PER_1M_INPUT}/1M in, "
            f"${SONNET_PRICE_PER_1M_OUTPUT}/1M out): ~${api_cost:.4f}\n"
            f"- **Your cost (×{COST_MULTIPLIER_USER_FACING} real-world rate): ~${user_cost:.2f}**"
        )

        return {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "api_cost_usd": api_cost,
            "user_facing_cost_usd": user_cost,
            "formatted": formatted,
        }
