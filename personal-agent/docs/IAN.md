# IAN — Plan, Map & Session Start

Single document: product plan, exact context files, agent definitions, guardrails, gaps, and the ordered read list for working on IAN. Replaces the former separate IAN_PLAN, IAN_MAP, and IAN_SESSION_START.

**Repo layout:** IAN lives at `personal-agent/` inside the lavprishjemmeside.dk repo. **Workspace root** for startup files = `personal-agent/`. **Repo root** (PROJECT_CONTEXT.md, tasks/) is resolved at runtime and is typically the **parent** of `personal-agent/`.

**Brand vision:** Brand vision is **per domain**, not a CMS/systems file. Each domain has its own `tasks/{domain}/BRAND_VISION.md` (e.g. `tasks/cms/BRAND_VISION.md`, `tasks/lavprishjemmeside.dk/BRAND_VISION.md`). The Planner loads the brand vision for the channel’s domain.

---

# Part A — Plan

## A.1 What IAN is

Slack-based AI that monitors client channels and answers lavprishjemmeside.dk product questions. Stays silent when you (owner) chat directly with clients.

| Item | Value |
|------|-------|
| **Location** | `personal-agent/` |
| **Product context** | `personal-agent/projects/lavprishjemmeside.md` |
| **Run** | `cd personal-agent && source .venv/bin/activate && python -m agent.main` |
| **Or** | launchd plist at `personal-agent/launchd/` |
| **Client channels** | `SLACK_CLIENT_CHANNELS` in `.env` |
| **Control channel** | `SLACK_CONTROL_CHANNEL_ID` — owner commands (`!status`, `!tools`, etc.) |

**v1.1 — Brainstormer & Planner:** Brainstormer (Haiku) runs idea refinement (`IDEATION → REFINEMENT → SYNTHESIS → APPROVED → TICKET_CREATED`). Planner (Sonnet) loads full project context and produces 10-section implementation plans with cost estimates. See [SOUL.md](../SOUL.md) and [RUNBOOK.md](RUNBOOK.md).

### Production Control Plane (Master Hub)

- **Control:** `ian_control` table; `/admin/master` toggles IAN ON/OFF via `POST /master/ian-control`.
- **Runtime:** IAN polls `GET /master/ian-control`; stops assignment processing when disabled.
- **Status:** operating → green; idle → yellow; off → red.
- **Accounting:** Completed assignments post to `POST /master/ian-assignment-complete`.

## A.2 Integration ideas (website project)

- **Admin:** IAN status widget, quick link to Slack channels, support stats.
- **AI-assembler:** Shared context with `/ai/context`; “Ask IAN” link; fallback to IAN when generation fails.
- **Contact/support:** Escalation copy; “IAN has been notified” when client has Slack.
- **Product context sync:** Auto-generate `lavprishjemmeside.md` from PROJECT_CONTEXT + component-docs; or `GET /api/ian-context` for live data.
- **Future:** Shopping module context, multi-domain per-client context, Pro AI agent handoff, traffic/analytics answers, Byggeklodser support.

## A.3 Product context maintenance

**File:** `personal-agent/projects/lavprishjemmeside.md` — keep updated when admin routes, components, or FAQs change. Options: manual edit, script (`generate-ian-context.mjs`), or API-driven.

## A.4 Quick reference

| Action | Command / Location |
|--------|--------------------|
| Run IAN | `cd personal-agent && source .venv/bin/activate && python -m agent.main` |
| Add client channel | Add channel ID to `SLACK_CLIENT_CHANNELS`, restart |
| Update product context | Edit `personal-agent/projects/lavprishjemmeside.md` |
| Brand vision (per domain) | Edit `tasks/{domain}/BRAND_VISION.md` (e.g. `tasks/cms/BRAND_VISION.md`) |

---

# Part B — Map

## B.0 IAN setup and Slack integration — worker context verification

Both Slack workers (Haiku = Brainstormer, Sonnet = Planner) receive the same **soul** (base system prompt) on every call, then persona-specific context is appended. Paths are resolved from two roots:

- **Workspace root** = `personal-agent/` (`cfg.project_root` in [agent/config.py](../agent/config.py)). Used for soul and IAN docs.
- **Repo root** = parent of `personal-agent/` when running inside the CMS repo; resolved by `_resolve_repo_root(cfg)` in [slack/handlers.py](../slack/handlers.py) (first path that contains `PROJECT_CONTEXT.md`). Used for PROJECT_CONTEXT, tasks/, docs/, projects/.

### Soul (both workers — loaded first, cached)

Loaded by [agent/claude_client.py](../agent/claude_client.py) from **workspace root** (`personal-agent/`). List from `MEMORY_STARTUP_FILES` (default `SOUL.md,USER.md,IDENTITY.md`).

| # | Path | Required |
|---|------|----------|
| 1 | `personal-agent/SOUL.md` | Yes |
| 2 | `personal-agent/USER.md` | Yes |
| 3 | `personal-agent/IDENTITY.md` | Yes |

If any are missing, that block is skipped (log only); if all missing, a minimal fallback line is used. Reload from disk with `!reload` in Slack.

### Haiku (Brainstormer) — full context

After soul, the handler appends:

| # | Source | Path / content |
|---|--------|-----------------|
| 4 | Product summary | First 2000 chars of `repo_root/PROJECT_CONTEXT.md` |
| 5 | Workflow + state | `personal-agent/docs/BRAINSTORMER_WORKFLOW.md` + state-specific instructions (IDEATION / REFINEMENT / SYNTHESIS / APPROVED) from [agent/brainstormer.py](../agent/brainstormer.py) |

So Haiku has: **SOUL, USER, IDENTITY, product summary, BRAINSTORMER_WORKFLOW**. No tools. Model: `cfg.anthropic.model_default` (Haiku).

### Sonnet (Planner) — full context

After soul, the handler appends:

| # | Source | Path / content |
|---|--------|-----------------|
| 4 | Full planner context | `planner_loader.load_all(domain)` — see table below |
| 5 | Planner instruction | Fixed 10-section + cost + `[PLAN:READY]` block (in handler) |

**Planner `load_all(domain)` order** (all paths relative to **repo root**):

| # | Path | Note |
|---|------|------|
| 1 | `tasks/{domain}/BRAND_VISION.md` | Per-domain; default domain = `cms` from channel map. If missing, placeholder text. |
| 2 | `PROJECT_CONTEXT.md` | Required |
| 3 | `docs/*.md` | All `.md` in main repo `docs/`, sorted |
| 4 | `personal-agent/docs/*.md` | All `.md` in `personal-agent/docs/`, sorted (includes IAN.md, PLANNER_WORKFLOW.md, etc.) |

So Sonnet has: **SOUL, USER, IDENTITY, tasks/{domain}/BRAND_VISION, PROJECT_CONTEXT, docs/*, personal-agent/docs/***, plus the Planner instruction block. Tools: `filesystem_read`, `filesystem_list` only. Model: `cfg.anthropic.model_heavy` (Sonnet).

### Verification checklist

Use this to confirm both workers have the needed files:

- [ ] `personal-agent/SOUL.md` exists  
- [ ] `personal-agent/USER.md` exists  
- [ ] `personal-agent/IDENTITY.md` exists  
- [ ] `personal-agent/docs/BRAINSTORMER_WORKFLOW.md` exists  
- [ ] `repo_root/PROJECT_CONTEXT.md` exists (parent of `personal-agent/` when in CMS repo)  
- [ ] `repo_root/tasks/cms/BRAND_VISION.md` exists (or the domain used by your control channel)  
- [ ] `repo_root/docs/` contains the main repo docs  
- [ ] `repo_root/personal-agent/docs/` contains IAN.md, PLANNER_WORKFLOW.md, IAN_OPERATING_STANDARD.md, RUNBOOK.md, etc.  
- [ ] `repo_root/projects/lavprishjemmeside.md` exists (for client channels and keyword-based project context)

Slack integration: same process uses **two Slack user tokens** (`SLACK_USER_TOKEN_HAIKU`, `SLACK_USER_TOKEN_SONNET`). Brainstormer replies via Haiku client; Planner replies via Sonnet client; general handler picks Haiku or Sonnet by model router. No change to which files are loaded — only which model and which extra context block are used.

---

## B.1 Exact files IAN reads for context

### Startup (every Claude call — cached)

From `personal-agent/` via [agent/claude_client.py](../agent/claude_client.py). Config: `MEMORY_STARTUP_FILES` (default `SOUL.md,USER.md,IDENTITY.md`).

| Order | File | Purpose |
|-------|------|---------|
| 1 | `SOUL.md` | Core policy, personas, model routing, response contracts |
| 2 | `USER.md` | Owner context, scope expectations |
| 3 | `IDENTITY.md` | Agent facts, tools, security perimeter |

**Reload:** `!reload` reads same list from disk ([slack/admin_commands.py](../slack/admin_commands.py)).

**Gap:** SOUL mentions `IAN_OPERATING_STANDARD.md` and daily note; they are not in default startup — add to config or inject if needed.

### General handler (control channel)

Startup + optional **project context** from `repo_root/projects/<name>.md` when message mentions a project ([agent/project_router.py](../agent/project_router.py)). Keywords: lavpris → `lavprishjemmeside.md`, artisan → `the_artisan.md`, ian → `personal_agent.md`, card-pulse → `card_pulse.md`, ai-clarity → `ai_clarity.md`. Repo root = first path with `PROJECT_CONTEXT.md` among the_artisan_path, project_root, project_root.parent ([slack/handlers.py](../slack/handlers.py)).

### Client channel

Startup + **always** `repo_root/projects/lavprishjemmeside.md` + inline `_CLIENT_SUPPORT_CTX`. No other docs.

### Brainstormer (Haiku)

Startup + first 2000 chars of `repo_root/PROJECT_CONTEXT.md` ([agent/planner_context.py](../agent/planner_context.py) `load_product_summary`) + [BRAINSTORMER_WORKFLOW.md](BRAINSTORMER_WORKFLOW.md) state block ([agent/brainstormer.py](../agent/brainstormer.py)).

### Planner (Sonnet)

Startup + **full planner context** from [agent/planner_context.py](../agent/planner_context.py) `load_all(domain)`. Order:

| Order | Path | Condition |
|-------|------|-----------|
| 1 | `tasks/{domain}/BRAND_VISION.md` | Per-domain; not a CMS file. If missing, placeholder. |
| 2 | `PROJECT_CONTEXT.md` | Required |
| 3 | `docs/*.md` | All, sorted |
| 4 | `personal-agent/docs/*.md` | All, sorted |

`domain` comes from the Slack channel (`SLACK_CHANNEL_DOMAIN_MAP`); default `cms`.

### Claude Code handoff

Structured payload only; [agent/handoff.py](../agent/handoff.py) finds up to 3 `tasks/**/*.md` paths by keyword for `linked_plan_files`. No file bodies in prompt.

---

## B.2 Files that define each agent

| Layer | File | Role |
|-------|------|------|
| Core policy | [SOUL.md](../SOUL.md) | Identity, rules, personas, model routing, response contracts |
| Operator identity | [IDENTITY.md](../IDENTITY.md) | Name, paths, capabilities, tool approval, security |
| User context | [USER.md](../USER.md) | Owner, timezone, scope, dev workflow rule |
| Fixed scope | [IAN_OPERATING_STANDARD.md](IAN_OPERATING_STANDARD.md) | Task types, dev boundary, persona routing |
| Brainstormer | [BRAINSTORMER_WORKFLOW.md](BRAINSTORMER_WORKFLOW.md) | State machine, Task Definition format |
| Planner | [PLANNER_WORKFLOW.md](PLANNER_WORKFLOW.md) | Context order, 10 sections, cost |
| Client support | `slack/handlers.py` `_CLIENT_SUPPORT_CTX` | Role, language, escalation |
| Product (lavpris) | `repo_root/projects/lavprishjemmeside.md` | Admin URLs, FAQs |

---

## B.3 Guardrails

| Layer | Where | What |
|-------|--------|------|
| Message filter | [slack/middleware.py](../slack/middleware.py) | Owner-only in control channel; client channels accept non-owner (owner dropped) |
| Input sanitization | [agent/security.py](../agent/security.py) | Null strip, 4000-char cap; injection logging; path traversal check |
| Intent gate | [agent/intent_router.py](../agent/intent_router.py) | DEV_HANDOFF / NEEDS_CLARIFICATION / OUT_OF_SCOPE → policy reply |
| Tool allow-list | [agent/intent_router.py](../agent/intent_router.py) | Per-intent tools; Brainstormer none; Planner read/list only |
| Budget | [agent/budget_tracker.py](../agent/budget_tracker.py) | Daily/monthly warn and block |
| Approval | [tools/approval.py](../tools/approval.py) | Shell/write/calendar_send/email_send require owner approval |
| Runtime control | [agent/runtime_control.py](../agent/runtime_control.py) | Master Hub ON/OFF |
| Persona routing | [agent/persona_router.py](../agent/persona_router.py) | Session continuity until terminal state |

---

## B.4 Links (personal-agent)

[README.md](../README.md) | [SOUL.md](../SOUL.md) | [USER.md](../USER.md) | [IDENTITY.md](../IDENTITY.md) | [IAN_OPERATING_STANDARD.md](IAN_OPERATING_STANDARD.md) | [RUNBOOK.md](RUNBOOK.md) | [BRAINSTORMER_WORKFLOW.md](BRAINSTORMER_WORKFLOW.md) | [PLANNER_WORKFLOW.md](PLANNER_WORKFLOW.md) | [projects/lavprishjemmeside.md](../projects/lavprishjemmeside.md) | [agent/config.py](../agent/config.py) | [agent/claude_client.py](../agent/claude_client.py) | [agent/planner_context.py](../agent/planner_context.py) | [agent/project_router.py](../agent/project_router.py) | [agent/persona_router.py](../agent/persona_router.py) | [agent/intent_router.py](../agent/intent_router.py) | [agent/brainstormer.py](../agent/brainstormer.py) | [agent/handoff.py](../agent/handoff.py) | [slack/handlers.py](../slack/handlers.py) | [slack/middleware.py](../slack/middleware.py)

**Parent repo:** [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) | [docs/COMPREHENSIVE_PLAN.md](../../docs/COMPREHENSIVE_PLAN.md) | [docs/CLAUDE_CODE_INTEGRATION.md](../../docs/CLAUDE_CODE_INTEGRATION.md) | [docs/README.md](../../docs/README.md) | [tasks/](../../tasks/)

---

## B.5 Gaps and 2026 recommendations

- **Startup vs SOUL:** Add `docs/IAN_OPERATING_STANDARD.md` to `MEMORY_STARTUP_FILES` or inject in handler.
- **Client channel:** Only one product file; consider PROJECT_CONTEXT summary or `GET /api/ian-context`.
- **Out-of-scope examples:** Add OUT_OF_SCOPE_EXAMPLES.md (or section in IAN_OPERATING_STANDARD) for tests/tuning.
- **Planner tasks index:** Optional `tasks/README.md` or `tasks/<domain>/INDEX.md` for Planner.
- **Guardrails doc:** Optional GUARDRAILS.md (message rules, intent→action, intent→tools, approval, budget).
- **Product freshness:** Script or API to refresh product context; keep `lavprishjemmeside.md` in sync with PROJECT_CONTEXT.

---

# Part C — Session Start (when working on IAN)

Read in this order for full context when debugging or extending IAN:

1. **This doc** — [IAN.md](IAN.md) (plan + map + session start).
2. **Core policy** — [SOUL.md](../SOUL.md).
3. **Operating standard** — [IAN_OPERATING_STANDARD.md](IAN_OPERATING_STANDARD.md).
4. **Workflows** — [BRAINSTORMER_WORKFLOW.md](BRAINSTORMER_WORKFLOW.md), [PLANNER_WORKFLOW.md](PLANNER_WORKFLOW.md).
5. **Code flow** — [slack/handlers.py](../slack/handlers.py) (message flow, personas, client ctx), [agent/persona_router.py](../agent/persona_router.py), [agent/intent_router.py](../agent/intent_router.py), [agent/planner_context.py](../agent/planner_context.py).
