"""
agent/budget_tracker.py — Real-time cost tracking with daily/monthly limits.

Token pricing (as of Feb 2026):
  Haiku  4.5: input $0.80/M, output $4.00/M, cache_write $1.00/M, cache_read $0.08/M
  Sonnet 4.6: input $3.00/M, output $15.00/M, cache_write $3.75/M, cache_read $0.30/M

Budget flow:
  1. After each Claude API call, record_usage() is called
  2. Costs are written to budget_events in SQLite
  3. check() returns a BudgetStatus with warn/block flags
  4. The handler checks status before every API call — blocks if over limit

Cache hit rate is logged so we can verify caching is actually saving money.
Target: cache_read > cache_creation within 24h of first run.
"""
from __future__ import annotations

import logging
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from memory.db import get_connection

logger = logging.getLogger(__name__)

# Pricing per million tokens (USD)
_PRICING: dict[str, dict[str, float]] = {
    "claude-haiku-4-5-20251001": {
        "input": 0.80,
        "output": 4.00,
        "cache_write": 1.00,
        "cache_read": 0.08,
    },
    "claude-sonnet-4-6": {
        "input": 3.00,
        "output": 15.00,
        "cache_write": 3.75,
        "cache_read": 0.30,
    },
}
_DEFAULT_PRICING = _PRICING["claude-haiku-4-5-20251001"]


def _cost_usd(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_written: int,
    cache_read: int,
) -> float:
    p = _PRICING.get(model, _DEFAULT_PRICING)
    return (
        input_tokens * p["input"] / 1_000_000
        + output_tokens * p["output"] / 1_000_000
        + cache_written * p["cache_write"] / 1_000_000
        + cache_read * p["cache_read"] / 1_000_000
    )


@dataclass
class BudgetStatus:
    daily_spent: float
    daily_limit: float
    monthly_spent: float
    monthly_limit: float
    daily_warn: bool
    monthly_warn: bool
    daily_blocked: bool
    monthly_blocked: bool

    @property
    def blocked(self) -> bool:
        return self.daily_blocked or self.monthly_blocked

    @property
    def warned(self) -> bool:
        return self.daily_warn or self.monthly_warn

    def summary(self) -> str:
        lines = [
            f"Daily:   ${self.daily_spent:.4f} / ${self.daily_limit:.2f}",
            f"Monthly: ${self.monthly_spent:.4f} / ${self.monthly_limit:.2f}",
        ]
        if self.daily_blocked:
            lines.append(":no_entry: Daily limit reached — API calls blocked")
        elif self.daily_warn:
            lines.append(f":warning: Daily spend at {self.daily_spent/self.daily_limit:.0%}")
        if self.monthly_blocked:
            lines.append(":no_entry: Monthly limit reached — API calls blocked")
        elif self.monthly_warn:
            lines.append(f":warning: Monthly spend at {self.monthly_spent/self.monthly_limit:.0%}")
        return "\n".join(lines)


class BudgetTracker:
    def __init__(
        self,
        db_path: Path,
        daily_limit: float = 5.0,
        daily_warn_pct: float = 0.50,
        monthly_limit: float = 200.0,
        monthly_warn_pct: float = 0.50,
    ) -> None:
        self._db_path = db_path
        self._daily_limit = daily_limit
        self._daily_warn_pct = daily_warn_pct
        self._monthly_limit = monthly_limit
        self._monthly_warn_pct = monthly_warn_pct

    def _conn(self) -> sqlite3.Connection:
        return get_connection(self._db_path)

    def record_usage(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cache_written: int = 0,
        cache_read: int = 0,
    ) -> float:
        """
        Persist an API call's token usage and return the cost in USD.

        Also logs cache hit rate for monitoring.
        """
        cost = _cost_usd(model, input_tokens, output_tokens, cache_written, cache_read)

        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO budget_events
                    (model, input_tokens, output_tokens, cache_written, cache_read, cost_usd)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (model, input_tokens, output_tokens, cache_written, cache_read, cost),
            )

        # Log cache efficiency
        total_input = input_tokens + cache_written + cache_read
        if total_input > 0:
            cache_pct = cache_read / total_input * 100
            logger.info(
                "budget.usage model=%s cost=$%.5f cache_hit=%.1f%% "
                "in=%d out=%d cache_write=%d cache_read=%d",
                model, cost, cache_pct,
                input_tokens, output_tokens, cache_written, cache_read,
            )

        return cost

    def check(self) -> BudgetStatus:
        """Return current spend vs limits. Call before every API call."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        month = datetime.now(timezone.utc).strftime("%Y-%m")

        with self._conn() as conn:
            daily = conn.execute(
                "SELECT COALESCE(SUM(cost_usd), 0) FROM budget_events "
                "WHERE created_at >= ?",
                (f"{today} 00:00:00",),
            ).fetchone()[0]

            monthly = conn.execute(
                "SELECT COALESCE(SUM(cost_usd), 0) FROM budget_events "
                "WHERE created_at >= ?",
                (f"{month}-01 00:00:00",),
            ).fetchone()[0]

        return BudgetStatus(
            daily_spent=daily,
            daily_limit=self._daily_limit,
            monthly_spent=monthly,
            monthly_limit=self._monthly_limit,
            daily_warn=daily >= self._daily_limit * self._daily_warn_pct,
            monthly_warn=monthly >= self._monthly_limit * self._monthly_warn_pct,
            daily_blocked=daily >= self._daily_limit,
            monthly_blocked=monthly >= self._monthly_limit,
        )

    def today_summary(self) -> dict:
        """Return today's aggregated stats by model."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT model,
                       COUNT(*) as calls,
                       SUM(input_tokens) as input,
                       SUM(output_tokens) as output,
                       SUM(cache_written) as cache_write,
                       SUM(cache_read) as cache_read,
                       SUM(cost_usd) as cost
                FROM budget_events
                WHERE created_at >= ?
                GROUP BY model
                """,
                (f"{today} 00:00:00",),
            ).fetchall()
        return {
            r[0]: {
                "calls": r[1],
                "input_tokens": r[2],
                "output_tokens": r[3],
                "cache_written": r[4],
                "cache_read": r[5],
                "cost_usd": round(r[6], 6),
            }
            for r in rows
        }
