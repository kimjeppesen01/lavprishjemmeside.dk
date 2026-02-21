# Personal AI Agent

A persistent, self-hosted AI agent running on your Mac — controlled exclusively via a private Slack channel.

## Architecture

```
Slack (Socket Mode)
      |
owner-only middleware  ← drops all non-owner events
      |
handlers.py
   /       \
admin cmds  user messages
               |
          dispatcher.py  ← Claude tool-use loop
          /    |    \
       router  conv  memory injection
                |
          claude_client.py
         (tool_use loop)
        /     |      \
    tools/  approval  audit logger
  (registry)  gate
   /  |  \
  fs shell web calendar email browser
```

## Quick Start

```bash
# 1. Create venv
python3.12 -m venv .venv && source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Fill in .env (copy from .env.example)
cp .env.example .env
# Edit .env with your actual API keys

# 4. Install as macOS service (auto-start on login)
bash scripts/install_service.sh

# 5. Verify it's running
launchctl print gui/$(id -u)/com.samlino.personalagent
```

## Environment Variables

See `.env.example` for the full list with descriptions.

Required variables that must be set before starting:
- `ANTHROPIC_API_KEY`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_OWNER_USER_ID`
- `SLACK_CONTROL_CHANNEL_ID`

## Slack App Setup

See `docs/RUNBOOK.md` for step-by-step Slack app creation instructions.

Required OAuth scopes: `app_mentions:read`, `chat:write`, `channels:history`,
`channels:read`, `im:history`, `im:write`, `users:read`

Required event subscriptions: `app_mention`, `message.im`

Socket Mode must be enabled with an App-Level Token (`xapp-...`).

## Admin Commands

Send these in your private Slack channel:

| Command | Description |
|---------|-------------|
| `!status` | Show uptime, model, memory count |
| `!health` | Check all subsystems |
| `!memory list` | Show all stored memories |
| `!memory add <category> <key> <value>` | Add a memory manually |
| `!memory delete <key>` | Remove a memory |
| `!tools list` | Show registered tools |
| `!tools disable <name>` | Disable a tool |
| `!history <n>` | Show last N conversation turns |
| `!clear session` | Clear current session history |
| `!logs <n>` | Tail last N audit log lines |
| `!reload` | Reload config |

## Available Tools

| Tool | Approval Required | Description |
|------|------------------|-------------|
| `read_file` | No | Read file contents (scoped to safe roots) |
| `write_file` | Yes | Write file contents |
| `list_directory` | No | List directory contents |
| `run_shell` | Always | Execute shell commands |
| `web_search` | No | Search the web (DuckDuckGo / Brave) |
| `fetch_page` | No | Fetch and extract text from a URL |
| `read_calendar` | No | Read upcoming calendar events |
| `create_calendar_event` | Yes | Create a calendar event |
| `read_email` | No | Read recent emails |
| `send_email` | Always | Send an email |

## Documentation

- [RUNBOOK.md](docs/RUNBOOK.md) — Operations guide
- [ADDING_TOOLS.md](docs/ADDING_TOOLS.md) — How to add new tools
- [IAN_OPERATING_STANDARD.md](docs/IAN_OPERATING_STANDARD.md) — Fixed-environment scope policy and response contracts
- [PROJECTS.md](memory/markdown/PROJECTS.md) — Known project context

## Project Structure

```
Personal-agent/
├── agent/          Core runtime (config, Claude client, dispatcher)
├── slack/          Slack integration (app, handlers, middleware)
├── memory/         SQLite + Markdown memory system
├── tools/          Extensible tool framework
├── audit/          JSONL audit logs
├── projects/       Per-project context files for the agent
├── launchd/        macOS service definition
├── scripts/        Setup and admin scripts
├── docs/           Documentation
└── tests/          Unit and integration tests
```
