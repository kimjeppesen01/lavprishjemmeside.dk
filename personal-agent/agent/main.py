"""
agent/main.py — Entry point for the personal agent.

Started by launchd via:
    /Users/samlino/Samlino/Personal-agent/.venv/bin/python agent/main.py
"""
from __future__ import annotations

import logging
import sys

import structlog

from agent.config import load as load_config
from audit.logger import AuditLogger
from slack.app import start as start_slack


def setup_logging(log_level: str) -> None:
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        stream=sys.stdout,
        level=level,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
    )


def main() -> None:
    # Load and validate config (fails fast if anything is missing)
    cfg = load_config()

    setup_logging(cfg.agent.log_level)
    log = structlog.get_logger()
    log.info("agent.start", name=cfg.agent.name, model=cfg.anthropic.model_default)

    # Ensure required directories exist at runtime
    cfg.memory.db_path.parent.mkdir(parents=True, exist_ok=True)
    cfg.memory.markdown_path.mkdir(parents=True, exist_ok=True)
    (cfg.memory.markdown_path / "daily").mkdir(parents=True, exist_ok=True)
    cfg.audit.log_path.mkdir(parents=True, exist_ok=True)
    (cfg.audit.log_path / "transcripts").mkdir(parents=True, exist_ok=True)
    (cfg.audit.log_path / "system").mkdir(parents=True, exist_ok=True)

    # Start audit logger and record startup event
    audit = AuditLogger(cfg.audit.log_path)
    audit.startup(
        model_default=cfg.anthropic.model_default,
        model_heavy=cfg.anthropic.model_heavy,
        cache_enabled=cfg.anthropic.prompt_cache_enabled,
        heartbeat_use_model=cfg.heartbeat.use_model,
    )

    log.info("agent.slack_start")
    start_slack(cfg, audit)


if __name__ == "__main__":
    main()
