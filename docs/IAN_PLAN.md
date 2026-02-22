# IAN — Client Support AI

> **What**: Slack-based AI that monitors client channels and answers lavprishjemmeside.dk product questions. Stays silent when you (owner) chat directly with clients.
>
> **Where**: `personal-agent/` (Python) — lives in this repo alongside CMS, API, and Astro frontend.

---

## 1. Current Implementation

| Item | Value |
|------|-------|
| **Location** | `personal-agent/` |
| **Product context** | `personal-agent/projects/lavprishjemmeside.md` |
| **Run** | `cd personal-agent && source .venv/bin/activate && python -m agent.main` |
| **Or** | launchd plist at `personal-agent/launchd/` — from project root |
| **Client channels** | `SLACK_CLIENT_CHANNELS` (comma-separated IDs) in `.env` — empty = control channel only |
| **Control channel** | `SLACK_CONTROL_CHANNEL_ID` — owner commands (`!status`, `!tools`, etc.) |

IAN uses the same Slack workspace, two Slack user accounts (Brainstormer + Planner), and project_router for other projects. Client channels get lavprishjemmeside product context injected automatically.

**v1.1 — Brainstormer & Planner personas** (2026-02-21): The two accounts are now purpose-built workflow agents. Brainstormer (Haiku model) runs a multi-turn idea refinement state machine (`IDEATION → REFINEMENT → SYNTHESIS → APPROVED → TICKET_CREATED`). Planner (Sonnet model) loads full project context and produces 10-section implementation plans with token cost estimates. Kanban columns: Ideas, Plans, In Review, Completed. See `personal-agent/SOUL.md` and `personal-agent/docs/RUNBOOK.md`.

### Production Control Plane (Master Hub)
- **Control source**: `ian_control` table in master DB (`enabled`, `desired_state`).
- **Dashboard control**: `/admin/master` toggles IAN ON/OFF via `POST /master/ian-control`.
- **Runtime sync**: IAN polls `GET /master/ian-control` with API key and stops assignment processing when disabled.
- **Status model**:
  - `operating` -> green dot
  - `idle` -> yellow dot
  - `off` -> red dot
- **Assignment accounting**: completed assignments post deltas to `POST /master/ian-assignment-complete`, updating cost/tokens/messages and `assignments_completed_today` immediately.

---

## 2. Integration Ideas — Website Project

### 2.1 Admin Dashboard
- **IAN status widget**: Online/offline, last heartbeat — reassure clients IAN is available
- **Quick link**: "Support clients via Slack" → opens Slack client channels (or invite flow)
- **Support stats**: Messages answered per channel (if logged) — surface in admin

### 2.2 AI-Assembler / Phase 7
- **Shared context**: IAN's `lavprishjemmeside.md` overlaps with `/ai/context` — consider a single source (e.g. CMS-derived doc) used by both
- **"Ask IAN" in AI workflow**: Optional "Not sure? IAN can help" link when generating pages — clients with Slack get live help
- **Fallback answers**: If AI-assembler fails, suggest "Ask IAN in your support channel"

### 2.3 Contact Form & Support
- **Escalation copy**: "Vores AI-assistent IAN kan også hjælpe i Slack — kontakt os for adgang"
- **Post-submit**: If client has Slack: "IAN has been notified and will follow up in your channel"

### 2.4 Product Context Sync
- **Auto-generate** `lavprishjemmeside.md` from: `PROJECT_CONTEXT.md`, component docs, `api/src/component-docs/`
- **Script**: `scripts/generate-ian-context.mjs` — runs before deploy; ensures IAN always has latest admin URLs, component names, FAQs

### 2.5 Read-Only API for IAN
- **`GET /api/ian-context`** (admin JWT or service token): Returns minimal read-only summary — page slugs, component list, design preset names — so IAN can answer "hvad er mine sider?" or "hvilke farver kan jeg vælge?" with live data
- **Scope**: One site per API; for multi-domain, each deployment has its own DB — IAN would call the right API per client

---

## 3. Integration Ideas — Future Applications

### 3.1 Shopping Module
- **Update** `lavprishjemmeside.md` with shop section: Admin → Shop (products, orders, shipping), common questions (pris, lager, levering, returnering)
- **IAN handles** shop support in client channels — same pattern as CMS

### 3.2 Multi-Domain Deployments
- **Per-client context**: Each domain may have different admin URL (e.g. `client.dk/admin/`). IAN could load client-specific context or a template with `{{DOMAIN}}` placeholders
- **Channel mapping**: `SLACK_CLIENT_CHANNELS` = one channel per client; IAN injects that client's domain/product context

### 3.3 Pro AI Agent (Future)
- **IAN** = human-facing support (Slack)
- **Pro** = CMS operator (content, SEO, publish) — automated
- **Handoff**: Client asks "kan du opdatere vores priser?" → IAN could (future) trigger Pro to update pricing-table content, or IAN replies with manual steps
- **Escalation**: Pro hits an edge case → "IAN, inform client we're looking into it"

### 3.4 Traffic / Analytics
- **IAN answers** "Hvordan kører min side?" using GA4/Search Console data
- **Option**: `GET /api/traffic/summary` (admin) — IAN fetches and summarizes for client; or IAN uses existing admin traffic page as reference

### 3.5 Phase 7 (Visual Page Builder / Byggeklodser)
- **Shared AI context**: Both IAN and Phase 7 need component library, design tokens. Single canonical source (DB + component-docs) keeps them aligned
- **IAN support**: "Hvordan bruger jeg byggeklodser?" → IAN explains upload mockup, AI maps to components, edit in page builder

---

## 4. Product Context Maintenance

**File**: `personal-agent/projects/lavprishjemmeside.md`

**Keep updated when**:
- New admin routes (e.g. `/admin/shop/`)
- New components or workflow changes
- New FAQ from support tickets
- Domain-specific info (multi-domain)

**Options**:
- **Manual**: Edit file directly; deploy with repo
- **Script**: `scripts/generate-ian-context.mjs` — reads `PROJECT_CONTEXT`, component-docs, outputs lavprishjemmeside.md
- **API-driven**: IAN calls `/api/ian-context` at runtime for live data (advanced)

---

## 5. Quick Reference

| Action | Command / Location |
|--------|--------------------|
| Run IAN | `cd personal-agent && source .venv/bin/activate && python -m agent.main` |
| Add client channel | Add channel ID to `SLACK_CLIENT_CHANNELS` in `.env`, restart |
| Update product context | Edit `personal-agent/projects/lavprishjemmeside.md` |
| Launchd (macOS) | `personal-agent/launchd/com.samlino.personalagent.plist` — update paths if moved |

---

## 6. Related Docs

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — IAN section, project structure
- [docs/MULTI_DOMAIN_CMS_PLAN.md](docs/MULTI_DOMAIN_CMS_PLAN.md) — Per-domain deployments; IAN supports all via channels
- [docs/SHOPPING_MODULE_PLAN.md](docs/SHOPPING_MODULE_PLAN.md) — Shop support context for IAN
- [docs/PHASE_7_AI_GENERATOR_SPEC_v2.md](docs/PHASE_7_AI_GENERATOR_SPEC_v2.md) — Shared AI context with IAN
