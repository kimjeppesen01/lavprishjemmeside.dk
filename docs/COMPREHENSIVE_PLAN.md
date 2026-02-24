# Comprehensive plan — lavprishjemmeside.dk

This document merges the main project context, multi-domain CMS plan, Claude Code integration, and Claude access/safeguards into a single reference. Use it as the one place for vision, architecture, status, and roadmap.

**Related docs (still the source of detail where linked):**
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — Daily reference: tech stack, hosting, gotchas, file tree, component library, developer notes.
- [docs/CLAUDE_CODE_INTEGRATION.md](docs/CLAUDE_CODE_INTEGRATION.md) — Full Claude Code reference: API, run flow, OAuth, troubleshooting, file list.
- [docs/MULTI_DOMAIN_CMS_PLAN.md](docs/MULTI_DOMAIN_CMS_PLAN.md) — Full multi-domain deployment and ZIP installer spec (phases, setup flow, checklist).
- [docs/ROLLOUT_MANUAL.md](docs/ROLLOUT_MANUAL.md) — Step-by-step rollout and setup instructions.

---

## Part A — Project foundation

### Overview

Danish business website (affordable web development). Static MPA (Astro + Tailwind v4), Node.js Express API in `api/`, MySQL, JWT auth, deployed to Nordicway cPanel via GitHub Actions.

| Item | Value |
|------|--------|
| Live URL | https://lavprishjemmeside.dk |
| API URL | https://api.lavprishjemmeside.dk |
| GitHub | https://github.com/kimjeppesen01/lavprishjemmeside.dk |

### Tech stack

- **Frontend:** Astro v5.17+, Tailwind v4 (`@tailwindcss/vite`), TypeScript strict.
- **API:** Node.js Express (CommonJS, `.cjs`), MySQL (theartis_lavpris), JWT + bcrypt, Resend email.
- **Hosting:** cPanel (cp10.nordicway.dk), LiteSpeed, Node 22, AutoSSL. Repo on server: `/home/theartis/repositories/lavprishjemmeside.dk/`. Document roots: `~/lavprishjemmeside.dk/` (site), `~/api.lavprishjemmeside.dk/` (API).
- **CI/CD:** GitHub Actions → build, commit dist, SSH deploy, `tmp/restart.txt` for LiteSpeed.

### Critical gotchas (cPanel + LiteSpeed + Node)

- **Restart in CI:** Use only `mkdir -p tmp && touch tmp/restart.txt`. No pkill in GitHub Actions (exit 143).
- **Manual restart:** `pkill -f 'lsnode:.*<app-dir>'` via SSH is fine.
- **API extension:** Use `.cjs` for API files; root has `"type": "module"`.
- **DB_HOST:** Use `127.0.0.1`, not `localhost`.
- **dotenv:** Use `path.join(__dirname, '.env')` so LiteSpeed finds `.env`.
- **SSH Node:** Default is v10; use `/opt/alt/alt-nodejs22/root/usr/bin/node` or the Node app venv.
- **Don’t touch public_html** (other site).

### CI/CD flow

Push to `main` → checkout, `npm ci`, `npm run build` → dist committed back → SSH: `git fetch && git reset --hard origin/main`, copy dist to site root, `api` npm install, touch `tmp/restart.txt`. Secrets: `FTP_SERVER`, `FTP_USERNAME`, `SSH_PORT`, `SSH_PRIVATE_KEY`.

### Project structure (key areas)

```
api/                  # Express API (.cjs, server.cjs)
api/src/routes/       # health, auth, events, sessions, master, publish, page-components, design-settings, media, etc.
api/src/middleware/   # auth (requireAuth, requireMaster), rateLimit, logger, cache
api/src/schema_*.sql  # schema_master.sql (sites, kanban), schema_master_role.sql, schema_master_audit.sql
src/pages/admin/      # Login, dashboard, master, pages, styling, media, components, traffic, etc.
src/layouts/          # Layout.astro (public), AdminLayout.astro (admin sidebar, auth guard)
```

---

## Part B — Multi-domain CMS: vision and deployment

### Product vision

- **Standardized backend:** Same CMS, 27-component library, page builder, design system, API per site.
- **Standalone per client:** Each client = own domain, own DB, own deploy. No shared multi-tenant backend. Enables future Pro AI agent per site without cross-tenant leakage.
- **Updates:** Core changes flow via upstream; clients pull/merge. Content stays in client DB.

### Deployment model

- **New domain:** Template/fork → cPanel (domain, MySQL, Node app) → `.env` (site/API URLs, DB, CORS, GITHUB_REPO) → schema + seed → deploy.
- **ZIP + 1-click:** Primary model. Extract ZIP, run `npm run setup` (scripts/setup.cjs): prompts for domain, DB, admin email/pass → creates api/.env, runs schema order, seeds components, spawns API, builds with PUBLIC_SITE_URL/PUBLIC_API_URL, copies dist to output. See [docs/MULTI_DOMAIN_CMS_PLAN.md](docs/MULTI_DOMAIN_CMS_PLAN.md) sections 8.1–8.10.
- **Phase 1–3:** Env-based config (PUBLIC_SITE_URL, PUBLIC_API_URL), parameterized deploy workflow, GITHUB_REPO in publish, DEPLOY_NEW_DOMAIN.md, setup-domain.mjs, verify-deploy.mjs — **implemented**.

### Implementation status (multi-domain)

| Phase | Status | Notes |
|-------|--------|------|
| 1.1 Env-based URLs | Done | astro.config, src, generate-theme.mjs |
| 1.2 Parameterized deploy | Done | deploy.yml |
| 1.3 GITHUB_REPO | Done | publish.js, .env.example |
| 2 Deploy docs + setup-domain | Done | DEPLOY_NEW_DOMAIN.md, setup-domain.mjs |
| 3 verify-deploy | Done | scripts/verify-deploy.mjs, npm run verify |
| 8 ZIP + setup.cjs | Done | setup.cjs, .env.dist, create-zip.sh, README_INSTALL.md |

### Risks and mitigations

- Merge conflicts: clients keep only config (env) local; code from upstream.
- Breaking schema: additive migrations; document breaking changes.
- Stale clients: document update cadence; optional “update available” in admin.

---

## Part C — Admin dashboard and Master Hub

### Admin overview

- **URL:** https://lavprishjemmeside.dk/admin/
- **Auth:** JWT in localStorage (`admin_token`). Auth guard redirects to `/admin/` if no token; to `/admin/dashboard/` if token and on login page.
- **Layout:** AdminLayout.astro (sidebar, no public header/footer, noindex). Data loaded client-side with `Authorization: Bearer <token>`.

### Admin pages

| Page | Path | Purpose |
|------|------|---------|
| Login | `/admin/` | Email + password, store JWT |
| Dashboard | `/admin/dashboard/` | Metrics, events/sessions tables |
| Master Hub | `/admin/master/` | Sites, Kanban, AI usage, **Claude Code** (master only) |
| Pages, Styling, Header/Footer, Components, AI-assemble, Media, Traffic | `/admin/...` | Per-feature admin |

### Claude Code integration (Master Hub)

- **What it is:** Claude Code tab in Master Hub. Master user picks a repo (from `sites`), enters a prompt; API spawns Claude CLI on the server and streams output via SSE.
- **Access:** Only `role = 'master'` can open `/admin/master` or call `/master/*`. Frontend hides “Master Hub” for non-master and redirects direct visits with “Kun master-brugere har adgang”.
- **Behaviour:** Repo list and cwd from `sites` (convention: `/home/theartis/repositories/<domain>`). Each run gets an injected “all domains” context block. Claude runs with **full autonomy** (`--dangerously-skip-permissions`).
- **Safeguards (implemented):** Master-only middleware; audit log (`master_audit_log`); rate limit on `POST /master/claude-run` (default 10/hour per user, `MASTER_CLAUDE_RUN_LIMIT`); optional `MASTER_ALLOWED_IPS` IP allow-list.
- **Schema:** Run `api/src/schema_master_role.sql` (add `master` to `users.role`), `api/src/schema_master_audit.sql` (create `master_audit_log`). Assign `role = 'master'` to users who may access Master Hub.
- **Full reference:** [docs/CLAUDE_CODE_INTEGRATION.md](docs/CLAUDE_CODE_INTEGRATION.md) — architecture, API endpoints, run flow, OAuth, config, DB, frontend behaviour, troubleshooting, file list.

---

## Part D — Claude Code: goals, decisions, status

### Goals (from Claude access plan)

- Claude Code as the **main development engine** (same workflow as in Cursor).
- **Access to all domains** — repo list from `sites`; injected context so Claude sees every site (name, domain, api_url, admin_url, repo path) each run.
- **Full autonomy** — no permission allow-list; keep `--dangerously-skip-permissions` so Claude can run any required commands.
- **Strong safeguards** for the control plane (page `/admin/master` and all `/master/*` APIs).

### Decisions and current behaviour

| Topic | Decision | Status |
|-------|----------|--------|
| Permissions | Full autonomy; no alignment with local .claude/settings.local.json | Implemented |
| Repo list | From `sites` table; convention path `~/repositories/<domain>` | Implemented |
| All-domains context | Prepend sites block to every claude-run prompt | Implemented |
| Master-only access | `requireMaster` on all `/master/*` except GET /master/me | Implemented |
| Audit | Every `/master/*` request logged to `master_audit_log`; claude-run meta: repo, taskId, prompt_length, prompt_preview | Implemented |
| Rate limit | POST /master/claude-run: 10/user/hour (MASTER_CLAUDE_RUN_LIMIT) | Implemented |
| IP allow-list | Optional MASTER_ALLOWED_IPS (comma-separated) | Implemented |
| Step-up auth | Re-enter password or 2FA to open Master Hub | Optional, later |
| Shorter master token | Shorter JWT or separate master token | Optional, later |

### Out of scope (Claude)

- Multi-repo in one task (multi-root workspace). One repo per run with full domain list in context is enough for now.
- WebFetch allow-list for all site URLs (can be added later if desired).
- `repo_path` column on `sites`; convention path is sufficient for current setup.

---

## Part E — Roadmap and implementation status

### Critical (security & performance)

- Automated log rotation for `security_logs` (archive/delete > 60 days).
- Change default admin password; force change on first login or deployment checklist.

### High priority (core dashboard)

- Date range filtering (events/sessions `?from=&to=`).
- Security logs page (`/admin/sikkerhed/`).
- User management (`/admin/brugere/`).
- Content pages management (`/admin/sider/`).
- Change password feature (`PUT /auth/password`).

### Medium priority (UX & analytics)

- Charts/trends (events per day, sessions over time).
- Session detail view (full page flow).
- Global toast notifications.
- Auto-refresh dashboard.
- Mobile-responsive admin improvements.
- Data export (CSV).

### Nice-to-have

- UTM tracking, Core Web Vitals, client-side error tracking, keyboard/ARIA, system dark mode.

### Pending (product)

- Component editor: drag-and-drop reorder of array items; A/B content variants per instance.
- Public pages: Priser, Om os, Kontakt.
- SEO content optimization.

### Version 1.1 TODO (Claude task guardrail UX)

- Master Hub Claude tab: redesign to a modern 3-step flow (`Site/Repo` -> `Kanban Task` -> `.md Plan File`) with strong mobile usability.
- Add Kanban-linked markdown file selection so tasks are anchored to the correct planning docs.
- Make `.md` selection mandatory before `Run` is enabled.
- If no `.md` file exists, force decision prompt: **"Should we plan a new .md file?"** before any run.
- Add create-plan flow for generating a new starter `.md` file and auto-selecting it for the run.
- Enforce this guardrail server-side in `/master/claude-run` so direct API calls cannot bypass it.
- Extend audit metadata with task id, selected `.md` path, and whether a new plan file was created.

### Process rules (enforced)

- `docs/` remains stable reference and must-read context.
- Pending execution work must be created and maintained only in `tasks/pending/`.
- Claude dashboard planning source-of-truth is `tasks/**/*.md`.
- Runs without a selected `.md` plan file are out of policy for v1.1.

### Completed phases

- Phases 1–5: Setup, API, admin infra, production infra, password reset.
- Phase 6: Component library (27 components), page builder, design/styling, overlap module.
- Claude Code integration: Master Hub, master role, safeguards, all-domains context, docs.

### Planned modules

- **Shopping:** [docs/SHOPPING_MODULE_PLAN.md](docs/SHOPPING_MODULE_PLAN.md) — e-commerce, Quickpay, cart, checkout.
- **IAN:** [docs/IAN_PLAN.md](docs/IAN_PLAN.md) → [personal-agent/docs/IAN.md](personal-agent/docs/IAN.md) — Slack-based client support AI (plan, map, session start in one doc).
- **Visual Page Builder:** [docs/VISUAL_PAGE_BUILDER_SPEC.md](docs/VISUAL_PAGE_BUILDER_SPEC.md) — AI visual page builder (`/admin/byggeklodser`).
- **Future:** [docs/FUTURE_IMPLEMENTATIONS.md](docs/FUTURE_IMPLEMENTATIONS.md) — CWV, testing, PWA, i18n, etc.

### Document map

| Document | Use |
|----------|-----|
| **PROJECT_CONTEXT.md** | Day-to-day: tech stack, hosting, gotchas, project structure, admin pages, component library, developer notes, completed phases. |
| **docs/README.md** | Documentation entry point and reading order (must-read + operational references). |
| **docs/MUST_READ.md** | Session-start protocol for new AI sessions. |
| **docs/AI_ENGINEERING_STANDARDS.md** | Industry-standard delivery framework for AI-assisted engineering in this project. |
| **docs/COMPREHENSIVE_PLAN.md** (this file) | Single consolidated plan: vision, multi-domain, Claude Code goals/status, roadmap. |
| **docs/CLAUDE_CODE_INTEGRATION.md** | Claude Code only: API, run flow, OAuth, env, DB, troubleshooting, file reference. |
| **docs/MULTI_DOMAIN_CMS_PLAN.md** | Multi-domain product vision, standalone model, ZIP + 1-click setup (full spec), phases, checklist. |
| **docs/ROLLOUT_MANUAL.md** | Human rollout steps and prompts for setup and deploy. |
| **docs/DEPLOY_NEW_DOMAIN.md** | Checklist for deploying to a new domain. |
| **docs/UPSTREAM_UPDATES.md** | How clients pull upstream and redeploy. |
| **tasks/README.md** | Execution workspace rules: pending work and task plans for Claude dashboard. |
