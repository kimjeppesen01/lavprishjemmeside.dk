"""
agent/config.py — Single source of truth for all configuration.

Loads from .env at import time and validates every required variable.
Fails fast with a clear error message so the agent never starts misconfigured.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


def _require(key: str) -> str:
    """Return the value of an env var or raise a clear error."""
    value = os.getenv(key, "").strip()
    if not value:
        raise RuntimeError(
            f"[config] Required environment variable {key!r} is missing or empty. "
            f"Fill it in {_PROJECT_ROOT / '.env'}"
        )
    return value


def _optional(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def _bool(key: str, default: bool = False) -> bool:
    return os.getenv(key, str(default)).strip().lower() in ("true", "1", "yes")


def _int(key: str, default: int = 0) -> int:
    try:
        return int(os.getenv(key, str(default)).strip())
    except ValueError:
        return default


def _float(key: str, default: float = 0.0) -> float:
    try:
        return float(os.getenv(key, str(default)).strip())
    except ValueError:
        return default


@dataclass(frozen=True)
class AnthropicConfig:
    api_key: str
    model_default: str  # Haiku — used for ~90% of tasks
    model_heavy: str    # Sonnet — architecture, security, complex reasoning
    max_tokens: int
    prompt_cache_enabled: bool


@dataclass(frozen=True)
class SlackConfig:
    # Two real user accounts — agent posts AS these, not as a bot.
    # Account 1 (Haiku): replies to routine messages via the cheaper model.
    # Account 2 (Sonnet): replies to complex messages via the heavy model.
    user_token_haiku: str   # xoxp-... for the Haiku-identity account
    user_token_sonnet: str  # xoxp-... for the Sonnet-identity account
    owner_user_id: str      # THE security perimeter — only messages from this user are processed
    control_channel_id: str
    poll_interval_seconds: int  # How often to check for new messages
    client_channels: list[str]


@dataclass(frozen=True)
class AgentConfig:
    name: str
    timezone: str
    log_level: str


@dataclass(frozen=True)
class MemoryConfig:
    db_path: Path
    markdown_path: Path
    max_conversation_tokens: int
    summarize_after_turns: int
    # Files loaded at session startup (keeps context lean: ~8KB)
    startup_files: list[str]


@dataclass(frozen=True)
class BudgetConfig:
    daily_limit_usd: float
    daily_warn_pct: float
    monthly_limit_usd: float
    monthly_warn_pct: float


@dataclass(frozen=True)
class RateConfig:
    min_seconds_between_calls: int
    min_seconds_between_searches: int
    max_searches_per_batch: int
    search_batch_break_seconds: int
    retry_wait_seconds: int  # after 429


@dataclass(frozen=True)
class HeartbeatConfig:
    interval_hours: int
    use_model: bool  # False = pure Python ping (recommended)


@dataclass(frozen=True)
class FilesystemConfig:
    safe_roots: list[Path]
    deny_patterns: list[str]


@dataclass(frozen=True)
class ShellConfig:
    require_approval: bool
    timeout_seconds: int
    blocked_commands: list[str]


@dataclass(frozen=True)
class SearchConfig:
    brave_api_key: str   # empty string = falls back to DuckDuckGo
    max_results: int


@dataclass(frozen=True)
class EmailConfig:
    enabled: bool
    require_approval: bool


@dataclass(frozen=True)
class CalendarConfig:
    enabled: bool
    write_require_approval: bool


@dataclass(frozen=True)
class BrowserConfig:
    enabled: bool
    headless: bool


@dataclass(frozen=True)
class ProjectsConfig:
    root: Path
    card_pulse_path: Path
    ai_clarity_path: Path
    the_artisan_path: Path


@dataclass(frozen=True)
class AuditConfig:
    log_path: Path
    retention_days: int


@dataclass(frozen=True)
class SchedulerConfig:
    enabled: bool
    daily_briefing_cron: str   # e.g. "0 8 * * 1-5"
    weekly_digest_cron: str    # e.g. "0 9 * * 1"


@dataclass(frozen=True)
class SecurityConfig:
    approval_timeout_seconds: int
    secret_rotation_reminder_days: int


@dataclass(frozen=True)
class LinkedInConfig:
    enabled: bool
    session_cookie: str   # li_at cookie from Chrome DevTools
    profile_url: str      # your own profile URL (optional context)


@dataclass(frozen=True)
class Config:
    anthropic: AnthropicConfig
    slack: SlackConfig
    agent: AgentConfig
    memory: MemoryConfig
    budget: BudgetConfig
    rate: RateConfig
    heartbeat: HeartbeatConfig
    filesystem: FilesystemConfig
    shell: ShellConfig
    search: SearchConfig
    email: EmailConfig
    calendar: CalendarConfig
    browser: BrowserConfig
    projects: ProjectsConfig
    audit: AuditConfig
    scheduler: SchedulerConfig
    security: SecurityConfig
    linkedin: LinkedInConfig
    project_root: Path = field(default=_PROJECT_ROOT)


def load() -> Config:
    """Load and validate all configuration. Call once at startup."""
    return Config(
        anthropic=AnthropicConfig(
            api_key=_require("ANTHROPIC_API_KEY"),
            model_default=_optional(
                "ANTHROPIC_MODEL_DEFAULT", "claude-haiku-4-5-20251001"
            ),
            model_heavy=_optional("ANTHROPIC_MODEL_HEAVY", "claude-sonnet-4-6"),
            max_tokens=_int("ANTHROPIC_MAX_TOKENS", 4096),
            prompt_cache_enabled=_bool("ANTHROPIC_PROMPT_CACHE_ENABLED", True),
        ),
        slack=SlackConfig(
            user_token_haiku=_require("SLACK_USER_TOKEN_HAIKU"),
            user_token_sonnet=_require("SLACK_USER_TOKEN_SONNET"),
            owner_user_id=_require("SLACK_OWNER_USER_ID"),
            control_channel_id=_require("SLACK_CONTROL_CHANNEL_ID"),
            poll_interval_seconds=_int("SLACK_POLL_INTERVAL_SECONDS", 5),
            client_channels=[
                ch.strip()
                for ch in _optional("SLACK_CLIENT_CHANNELS", "").split(",")
                if ch.strip()
            ],
        ),
        agent=AgentConfig(
            name=_optional("AGENT_NAME", "Sam"),
            timezone=_optional("AGENT_TIMEZONE", "Europe/Copenhagen"),
            log_level=_optional("AGENT_LOG_LEVEL", "INFO"),
        ),
        memory=MemoryConfig(
            db_path=Path(
                _optional(
                    "MEMORY_DB_PATH",
                    str(_PROJECT_ROOT / "data" / "agent.db"),
                )
            ),
            markdown_path=Path(
                _optional(
                    "MEMORY_MARKDOWN_PATH",
                    str(_PROJECT_ROOT / "memory" / "markdown"),
                )
            ),
            max_conversation_tokens=_int("MEMORY_MAX_CONVERSATION_TOKENS", 8000),
            summarize_after_turns=_int("MEMORY_SUMMARIZE_AFTER_TURNS", 20),
            startup_files=[
                f.strip()
                for f in _optional(
                    "MEMORY_STARTUP_FILES", "SOUL.md,USER.md,IDENTITY.md"
                ).split(",")
                if f.strip()
            ],
        ),
        budget=BudgetConfig(
            daily_limit_usd=_float("BUDGET_DAILY_LIMIT_USD", 5.0),
            daily_warn_pct=_float("BUDGET_DAILY_WARN_PCT", 0.75),
            monthly_limit_usd=_float("BUDGET_MONTHLY_LIMIT_USD", 200.0),
            monthly_warn_pct=_float("BUDGET_MONTHLY_WARN_PCT", 0.75),
        ),
        rate=RateConfig(
            min_seconds_between_calls=_int("RATE_MIN_SECONDS_BETWEEN_CALLS", 5),
            min_seconds_between_searches=_int("RATE_MIN_SECONDS_BETWEEN_SEARCHES", 10),
            max_searches_per_batch=_int("RATE_MAX_SEARCHES_PER_BATCH", 5),
            search_batch_break_seconds=_int("RATE_SEARCH_BATCH_BREAK_SECONDS", 120),
            retry_wait_seconds=_int("RATE_429_RETRY_WAIT_SECONDS", 300),
        ),
        heartbeat=HeartbeatConfig(
            interval_hours=_int("HEARTBEAT_INTERVAL_HOURS", 1),
            use_model=_bool("HEARTBEAT_USE_MODEL", False),
        ),
        filesystem=FilesystemConfig(
            safe_roots=[
                Path(p.strip())
                for p in _optional(
                    "FS_SAFE_ROOTS",
                    "/Users/samlino/Samlino,/Users/samlino/Desktop",
                ).split(",")
                if p.strip()
            ],
            deny_patterns=[
                p.strip()
                for p in _optional(
                    "FS_DENY_PATTERNS", ".env,.git/config,id_rsa"
                ).split(",")
                if p.strip()
            ],
        ),
        shell=ShellConfig(
            require_approval=_bool("SHELL_REQUIRE_APPROVAL", True),
            timeout_seconds=_int("SHELL_TIMEOUT_SECONDS", 30),
            blocked_commands=[
                c.strip()
                for c in _optional(
                    "SHELL_BLOCKED_COMMANDS", "rm -rf,sudo rm,pkill"
                ).split(",")
                if c.strip()
            ],
        ),
        search=SearchConfig(
            brave_api_key=_optional("BRAVE_SEARCH_API_KEY", ""),
            max_results=_int("SEARCH_MAX_RESULTS", 5),
        ),
        email=EmailConfig(
            enabled=_bool("EMAIL_ENABLED", True),
            require_approval=_bool("EMAIL_REQUIRE_APPROVAL", True),
        ),
        calendar=CalendarConfig(
            enabled=_bool("CALENDAR_ENABLED", True),
            write_require_approval=_bool("CALENDAR_WRITE_REQUIRE_APPROVAL", True),
        ),
        browser=BrowserConfig(
            enabled=_bool("BROWSER_ENABLED", True),
            headless=_bool("BROWSER_HEADLESS", True),
        ),
        projects=ProjectsConfig(
            root=Path(_optional("PROJECTS_ROOT", "/Users/samlino/Samlino")),
            card_pulse_path=Path(
                _optional(
                    "CARD_PULSE_PATH",
                    "/Users/samlino/Samlino/LOVEABLE APPLICATIONS/card-pulse",
                )
            ),
            ai_clarity_path=Path(
                _optional(
                    "AI_CLARITY_PATH",
                    "/Users/samlino/Samlino/LOVEABLE APPLICATIONS/ai-clarity",
                )
            ),
            the_artisan_path=Path(
                _optional(
                    "THE_ARTISAN_PATH", "/Users/samlino/Samlino/The-artisan"
                )
            ),
        ),
        audit=AuditConfig(
            log_path=Path(
                _optional(
                    "AUDIT_LOG_PATH",
                    str(_PROJECT_ROOT / "audit" / "logs"),
                )
            ),
            retention_days=_int("AUDIT_RETENTION_DAYS", 90),
        ),
        scheduler=SchedulerConfig(
            enabled=_bool("SCHEDULER_ENABLED", True),
            daily_briefing_cron=_optional("DAILY_BRIEFING_CRON", "0 8 * * 1-5"),
            weekly_digest_cron=_optional("WEEKLY_DIGEST_CRON", "0 9 * * 1"),
        ),
        security=SecurityConfig(
            approval_timeout_seconds=_int("APPROVAL_TIMEOUT_SECONDS", 120),
            secret_rotation_reminder_days=_int("SECRET_ROTATION_REMINDER_DAYS", 90),
        ),
        linkedin=LinkedInConfig(
            enabled=_bool("LINKEDIN_ENABLED", False),
            session_cookie=_optional("LINKEDIN_SESSION_COOKIE", ""),
            profile_url=_optional("LINKEDIN_PROFILE_URL", ""),
        ),
    )


# Module-level singleton — import and use `from agent.config import cfg`
# We do NOT call load() at import time so tests can patch env vars freely.
# Call `cfg = config.load()` once in main.py.
