"""Tests for agent/budget_tracker.py"""
import tempfile
from pathlib import Path

import pytest

from memory.db import migrate
from agent.budget_tracker import BudgetTracker, _cost_usd


@pytest.fixture
def db(tmp_path):
    path = tmp_path / "test.db"
    migrate(path)
    return path


def test_cost_calculation_haiku():
    # 1M input + 1M output + no cache = $0.80 + $4.00 = $4.80
    cost = _cost_usd("claude-haiku-4-5-20251001", 1_000_000, 1_000_000, 0, 0)
    assert abs(cost - 4.80) < 0.001


def test_cost_calculation_cache_read():
    # Cache read is 90% cheaper than input
    cost_no_cache = _cost_usd("claude-haiku-4-5-20251001", 1_000_000, 0, 0, 0)
    cost_cache_read = _cost_usd("claude-haiku-4-5-20251001", 0, 0, 0, 1_000_000)
    assert cost_cache_read < cost_no_cache * 0.15  # at least 85% cheaper


def test_record_and_check(db):
    bt = BudgetTracker(db, daily_limit=1.0, daily_warn_pct=0.5)
    cost = bt.record_usage("claude-haiku-4-5-20251001", 100_000, 10_000, 0, 0)
    assert cost > 0
    status = bt.check()
    assert status.daily_spent > 0
    assert not status.blocked


def test_daily_limit_blocks(db):
    bt = BudgetTracker(db, daily_limit=0.000001)
    bt.record_usage("claude-haiku-4-5-20251001", 1000, 100, 0, 0)
    assert bt.check().daily_blocked


def test_warn_threshold(db):
    bt = BudgetTracker(db, daily_limit=1.0, daily_warn_pct=0.0)
    bt.record_usage("claude-haiku-4-5-20251001", 1, 1, 0, 0)
    assert bt.check().daily_warn  # 0% threshold = always warn


def test_today_summary(db):
    bt = BudgetTracker(db)
    bt.record_usage("claude-haiku-4-5-20251001", 500, 100, 0, 200)
    summary = bt.today_summary()
    assert "claude-haiku-4-5-20251001" in summary
    assert summary["claude-haiku-4-5-20251001"]["calls"] == 1
