# Personal Agent (IAN)

IAN is a Slack-based operations agent for lavprishjemmeside.dk, running inside `personal-agent/`.
It uses two Slack user tokens:
- Brainstormer (Haiku)
- Planner (Sonnet)

## Runtime Modes

## Server production (primary)
Use server watchdog + control-plane:
- `scripts/deploy.sh` (venv + deps + cron watchdog)
- `scripts/watchdog.sh` (respects `/master/ian-control` ON/OFF)
- `scripts/ianctl.sh` (start/stop/restart/status)

The process can be disabled from Master Hub (`/admin/master`) using IAN ON/OFF.

## Local development (secondary)
```bash
cd personal-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m agent.main
```

## Required Environment

Copy `.env.example` to `.env` and fill:
- `ANTHROPIC_API_KEY`
- `SLACK_USER_TOKEN_HAIKU`
- `SLACK_USER_TOKEN_SONNET`
- `SLACK_OWNER_USER_ID`
- `SLACK_CONTROL_CHANNEL_ID`
- `KANBAN_API_URL`
- `KANBAN_API_KEY` (must match `MASTER_API_KEY` in API)

## Key Behavior

- Fixed-environment policy enforcement in Slack handlers.
- Out-of-scope and dev handoff requests create backlog tickets.
- Brainstormer/Planner flows sync tickets to CMS Kanban.
- Runtime control polls `/master/ian-control` and can soft-stop processing.
- Assignment completion pushes immediate cost/token/message deltas to Master API.

## Documentation

- **`docs/IAN.md`** — Single IAN doc: plan, context map, agent definitions, guardrails, session-start order (replaces former IAN_PLAN, IAN_MAP, IAN_SESSION_START).
- `docs/RUNBOOK.md` — Server setup, ianctl, env, verification.
- `docs/IAN_OPERATING_STANDARD.md` — Fixed task types, dev boundary, response contracts.
- `docs/BRAINSTORMER_WORKFLOW.md` — Brainstormer state machine and format.
- `docs/PLANNER_WORKFLOW.md` — Planner context order and 10-section output.
- `../docs/IAN_PLAN.md` — Short pointer to personal-agent/docs/IAN.md (main repo).
