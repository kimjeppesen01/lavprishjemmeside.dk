# RUNBOOK — IAN (Server + Slack)

## 1. Purpose

Operate IAN reliably in production with:
- Slack polling (dual user tokens)
- Master control-plane ON/OFF integration
- Kanban + assignment metric sync to CMS API

## 2. Production Setup (Server)

From `personal-agent/`:

```bash
bash scripts/deploy.sh
cp .env.server-example .env
# edit .env with real keys
bash scripts/watchdog.sh
```

Watchdog cron runs every minute and:
- checks `/master/ian-control`
- stops IAN when disabled
- restarts IAN when enabled and not running

## 3. Service Control

```bash
bash scripts/ianctl.sh status
bash scripts/ianctl.sh start
bash scripts/ianctl.sh stop
bash scripts/ianctl.sh restart
```

Logs:
- `audit/logs/system/stdout.log`
- `audit/logs/system/stderr.log`
- `audit/logs/system/watchdog.log`

## 4. Required Env Keys

Minimum required:
- `ANTHROPIC_API_KEY`
- `SLACK_USER_TOKEN_HAIKU`
- `SLACK_USER_TOKEN_SONNET`
- `SLACK_OWNER_USER_ID`
- `SLACK_CONTROL_CHANNEL_ID`
- `KANBAN_API_URL`
- `KANBAN_API_KEY`
- `KANBAN_SYNC_ENABLED=true`
- `IAN_CONTROL_SYNC_ENABLED=true`
- `IAN_CONTROL_POLL_SECONDS=10`

## 5. Slack Token Notes

Use user OAuth tokens (`xoxp-`) for both identities:
- Brainstormer account token -> `SLACK_USER_TOKEN_HAIKU`
- Planner account token -> `SLACK_USER_TOKEN_SONNET`

Both accounts must be in control channel + client channels.

## 6. Runtime Verification

1. `ianctl status` returns running PID.
2. Master dashboard `/admin/master` shows IAN agents.
3. Toggle OFF in Master -> dots become red; agent stops processing.
4. Toggle ON in Master -> watchdog restarts; status returns idle/operating.

## 7. Local Dev (Optional)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m agent.main
```

Use only for development. Production should run via server watchdog.
