"""Tests for memory/store.py and memory/history.py"""
import tempfile
from pathlib import Path

import pytest

from memory.db import migrate
from memory.history import ConversationHistory, count_tokens
from memory.store import MemoryStore


@pytest.fixture
def db(tmp_path):
    path = tmp_path / "test.db"
    migrate(path)
    return path


@pytest.fixture
def store(db, tmp_path):
    return MemoryStore(db, tmp_path / "markdown")


@pytest.fixture
def hist(db):
    return ConversationHistory(db, max_tokens=500)


class TestMemoryStore:
    def test_save_and_search(self, store):
        store.save_note("project-1", "card-pulse is a fintech dashboard", "project")
        results = store.search("fintech")
        assert any(r["key"] == "project-1" for r in results)

    def test_overwrite_by_key(self, store):
        store.save_note("k1", "original content", "")
        store.save_note("k1", "updated content", "")
        result = store.get_note("k1")
        assert result == "updated content"

    def test_delete_note(self, store):
        store.save_note("del-me", "temporary", "")
        assert store.delete_note("del-me") is True
        assert store.get_note("del-me") is None
        assert store.delete_note("del-me") is False

    def test_daily_note(self, store):
        store.append_to_daily("IAN started up at 08:00")
        note = store.today_note()
        assert note is not None
        assert "IAN started up" in note

    def test_search_no_results(self, store):
        assert store.search("xyzquuxnonexistent") == []


class TestConversationHistory:
    def test_session_create_and_reuse(self, hist):
        sid1 = hist.get_or_create_session("C1")
        sid2 = hist.get_or_create_session("C1")
        assert sid1 == sid2

    def test_different_channels_different_sessions(self, hist):
        sid1 = hist.get_or_create_session("C1")
        sid2 = hist.get_or_create_session("C2")
        assert sid1 != sid2

    def test_end_session_creates_new(self, hist):
        sid1 = hist.get_or_create_session("C1")
        hist.end_session(sid1)
        sid2 = hist.get_or_create_session("C1")
        assert sid1 != sid2

    def test_token_limit_enforced(self, hist):
        sid = hist.get_or_create_session("C-tokens")
        # Add many messages
        for i in range(20):
            hist.add_message(sid, "user", f"message number {i} with some extra words")
            hist.add_message(sid, "assistant", f"reply number {i} with some extra words")
        messages = hist.get_messages(sid)
        total = sum(count_tokens(m["content"]) for m in messages)
        assert total <= 500

    def test_turn_counter(self, hist):
        sid = hist.get_or_create_session("C-turns")
        hist.add_message(sid, "user", "hi")
        hist.add_message(sid, "assistant", "hello")
        hist.add_message(sid, "user", "bye")
        hist.add_message(sid, "assistant", "goodbye")
        assert hist.get_turn_count(sid) == 2  # only assistant messages increment turns
