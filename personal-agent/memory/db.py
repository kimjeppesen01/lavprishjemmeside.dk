"""
memory/db.py — SQLite schema, migrations, and connection factory.

Schema:
  messages        — Per-conversation turn history (role, content, token count)
  memory_notes    — Persistent facts (FTS5 full-text search index)
  budget_events   — Per-API-call cost tracking for daily/monthly limits
  sessions        — Conversation session metadata

All migrations are applied automatically at startup via migrate().
Add new migrations as numbered SQL strings in MIGRATIONS list — never edit
existing ones.
"""
from __future__ import annotations

import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Migration list — append only. Never edit or remove existing entries.
# ---------------------------------------------------------------------------
MIGRATIONS: list[str] = [
    # Migration 001 — initial schema
    """
    CREATE TABLE IF NOT EXISTS schema_version (
        version     INTEGER PRIMARY KEY,
        applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id          TEXT PRIMARY KEY,
        channel_id  TEXT NOT NULL,
        started_at  TEXT NOT NULL DEFAULT (datetime('now')),
        ended_at    TEXT,
        turn_count  INTEGER NOT NULL DEFAULT 0,
        summary     TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id      TEXT NOT NULL REFERENCES sessions(id),
        role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content         TEXT NOT NULL,
        model           TEXT,
        input_tokens    INTEGER DEFAULT 0,
        output_tokens   INTEGER DEFAULT 0,
        cache_written   INTEGER DEFAULT 0,
        cache_read      INTEGER DEFAULT 0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session
        ON messages (session_id, created_at);

    CREATE VIRTUAL TABLE IF NOT EXISTS memory_notes USING fts5(
        key,
        content,
        tags,
        tokenize = 'porter ascii'
    );

    CREATE TABLE IF NOT EXISTS budget_events (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        model           TEXT NOT NULL,
        input_tokens    INTEGER NOT NULL DEFAULT 0,
        output_tokens   INTEGER NOT NULL DEFAULT 0,
        cache_written   INTEGER NOT NULL DEFAULT 0,
        cache_read      INTEGER NOT NULL DEFAULT 0,
        cost_usd        REAL NOT NULL DEFAULT 0.0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO schema_version (version) VALUES (1);
    """,
    # Migration 002 — structured backlog requests for out-of-scope/dev handoff
    """
    CREATE TABLE IF NOT EXISTS backlog_requests (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id           TEXT UNIQUE,
        title               TEXT NOT NULL,
        requester           TEXT,
        channel             TEXT,
        summary             TEXT NOT NULL,
        requested_outcome   TEXT,
        impact              TEXT,
        handoff_target      TEXT NOT NULL,
        status              TEXT NOT NULL DEFAULT 'open',
        intent              TEXT NOT NULL,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_backlog_requests_created
        ON backlog_requests (created_at DESC);

    INSERT OR IGNORE INTO schema_version (version) VALUES (2);
    """,
    # Migration 003 — handoff payload + linked plan files for Claude Code routing
    """
    ALTER TABLE backlog_requests ADD COLUMN handoff_payload TEXT;
    ALTER TABLE backlog_requests ADD COLUMN linked_plan_files TEXT;

    INSERT OR IGNORE INTO schema_version (version) VALUES (3);
    """,
    # Migration 004 — persona state machine metadata (Brainstormer/Planner workflows)
    """
    ALTER TABLE sessions ADD COLUMN session_metadata TEXT;

    INSERT OR IGNORE INTO schema_version (version) VALUES (4);
    """,
]


def migrate(db_path: Path) -> None:
    """
    Apply all pending migrations to the database.

    Safe to call on every startup — already-applied migrations are skipped.
    Creates the database file if it doesn't exist.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")

        # Bootstrap: create schema_version if this is a fresh DB
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_version (
                version     INTEGER PRIMARY KEY,
                applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.commit()

        applied = {
            row[0]
            for row in conn.execute("SELECT version FROM schema_version").fetchall()
        }

        for i, sql in enumerate(MIGRATIONS, start=1):
            if i not in applied:
                logger.info("Applying DB migration %d", i)
                conn.executescript(sql)
                conn.commit()

        logger.info("DB migrations complete | path=%s", db_path)
    finally:
        conn.close()


def get_connection(db_path: Path) -> sqlite3.Connection:
    """
    Return a sqlite3 connection with WAL mode and FK enforcement.

    Caller is responsible for closing. For async code use aiosqlite directly.
    """
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn
