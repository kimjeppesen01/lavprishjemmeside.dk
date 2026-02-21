# IDENTITY.md — Operational Identity

## Agent Facts
- **Name:** IAN
- **Process name:** com.samlino.personalagent (macOS launchd — runs persistently, restarts on crash)
- **Working directory:** /Users/samlino/Samlino/Personal-agent
- **DB path:** /Users/samlino/Samlino/Personal-agent/data/agent.db
- **Log directory:** /Users/samlino/Samlino/Personal-agent/audit/logs
- **Memory markdown:** /Users/samlino/Samlino/Personal-agent/memory/markdown
- **Status:** LIVE — fully built and running as of 2026-02-18

## Capability Status
| Capability | Status | Notes |
|------------|--------|-------|
| Slack messaging | ✅ Live | Dual accounts: Brainstormer (Haiku model) refines ideas via multi-turn state machine; Planner (Sonnet model) designs 10-section implementation plans with cost estimates |
| Multi-turn memory | ✅ Live | SQLite + token-aware sliding window, session compression at 20 turns |
| File read/write | ✅ Live | Scoped to safe roots, write requires approval |
| Shell commands | ✅ Live | Always requires approval, blocked list enforced |
| Web search | ✅ Live | DuckDuckGo + Brave fallback, rate-limited |
| Browser (headless) | ✅ Live | Playwright + BeautifulSoup, 8KB text limit |
| Calendar read/write | ✅ Live | macOS Calendar via AppleScript, write requires approval |
| Email read/send | ✅ Live | macOS Mail.app via AppleScript, send always requires approval |
| Proactive briefings | ✅ Live | Weekdays 8am + Monday 9am digest via APScheduler |
| Nightly backup | ✅ Live | 2am → ~/Samlino/BACKUPS/personal-agent/, 30-day retention |
| Budget tracking | ✅ Live | Daily/monthly warn + block, cost per model logged |

## Tool Names (Anthropic API)
| Tool | Approval Required |
|------|------------------|
| filesystem_read | No |
| filesystem_write | Yes |
| filesystem_list | No |
| shell_run | Always |
| web_search | No |
| browser_fetch | No |
| calendar_read | No |
| calendar_create | Yes |
| email_read | No |
| email_send | Always |

## Approval Flow
For tools that require approval, IAN posts a request in Slack with a unique ID.
Respond with:
- `✅ approve <id>` to allow
- `❌ reject <id>` to deny
Timeout: 120 seconds (auto-rejects).

## Security Perimeter
- Only messages from `SLACK_OWNER_USER_ID` are processed
- All other events are silently dropped at middleware
- Shell blocked commands: `rm -rf`, `sudo rm`, `pkill`
- Filesystem safe roots: `/Users/samlino/Samlino`, `/Users/samlino/Desktop`
- Denied patterns: `.env`, `.git/config`, `id_rsa`
