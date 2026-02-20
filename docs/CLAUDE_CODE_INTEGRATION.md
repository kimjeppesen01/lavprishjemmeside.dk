# Claude Code integration — full reference

This document describes the **Claude Code** integration in the Master Hub: how the dashboard runs the Claude CLI on the server, how authentication and safeguards work, and how to operate and extend it.

**See also:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) — Admin Dashboard and *Claude Code integration* section (overview and link to this doc).

---

## 1. Overview

- **What it is:** The Master Hub at `/admin/master/` includes a **Claude Code** tab. A master user submits a task (prompt) and chooses a **repository** (one of the registered sites). The API spawns the **Claude CLI** on the server in that repo’s directory and streams the CLI output back to the browser via Server-Sent Events (SSE).
- **Purpose:** Run Claude Code (same model and behaviour as in Cursor/VS Code) from the browser against any of your multi-site repos, with **full autonomy** (no permission allow-list) and with **all domains** injected into context so Claude is aware of every site.
- **Access:** Only users with `role = 'master'` can open `/admin/master` or call any `/master/*` API. Strong safeguards (audit log, rate limits, optional IP allow-list) protect this control plane.

---

## 2. Architecture

```mermaid
sequenceDiagram
  participant Browser
  participant API as API (Express)
  participant DB as MySQL
  participant CLI as Claude CLI (server)

  Browser->>API: POST /master/claude-run (JWT master)
  API->>DB: getSitesRepoMap() + audit log
  API->>API: resolve cwd, build context block
  API->>CLI: spawn claude -p "<context> + prompt"
  loop SSE
    CLI-->>API: stdout/stderr
    API-->>Browser: data: { type, text }
  end
  CLI-->>API: exit
  API-->>Browser: data: { type: done }
```

- **Frontend:** [src/pages/admin/master.astro](../src/pages/admin/master.astro) — Claude Code tab: repo dropdown (from `GET /master/claude-repos`), model selector, account selector, prompt textarea, Run/Kill, and an output area that consumes SSE.
- **Backend:** [api/src/routes/master.js](../api/src/routes/master.js) — All Claude-related routes and the spawn/SSE logic; uses [api/src/middleware/auth.js](../api/src/middleware/auth.js) (`requireMaster`) and [api/src/middleware/rateLimit.js](../api/src/middleware/rateLimit.js) (`claudeRunRateLimiter`).
- **Data:** Repo list and working directory are derived from the **sites** table (convention: repo path = `/home/theartis/repositories/<domain>`). No separate “Claude repos” table.

---

## 3. API endpoints (Claude-related)

All require `Authorization: Bearer <JWT>` with a user that has `role = 'master'`, except `GET /master/me` (admin or master, returns `is_master`).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/master/me` | Returns `{ is_master }` for current user (no requireMaster). |
| GET | `/master/claude-repos` | List repos for the Claude tab: `[{ id, name, domain, repo_path }]` from active sites. |
| GET | `/master/claude-accounts` | List Claude config dirs: default `~/.claude` plus any `CLAUDE_CONFIG_DIR_*` env vars. |
| GET | `/master/claude-auth-status?account_dir=...` | Check if the given account dir has valid OAuth credentials. |
| GET | `/master/claude-context-files?repo=...` | List available `.md`/`.txt` docs in the selected repo for run-time context selection. |
| POST | `/master/claude-run` | Run Claude CLI; body: `{ prompt, repo, model, account_dir?, timeout_min?, context_files?, kanban_item_id? }`; response: SSE stream. |
| DELETE | `/master/claude-run/:taskId` | Kill a running Claude task. |
| POST | `/master/claude-auth-start` | Start OAuth flow; body: `{ account_dir? }`; returns `{ url, account_dir }` for user to open. |
| POST | `/master/claude-auth-code` | Complete OAuth; body: `{ code }`; writes credentials to `account_dir`. |

---

## 4. Run flow (POST /master/claude-run)

1. **Auth & rate limit:** `requireAuth` → `requireMaster` → `claudeRunRateLimiter` (default 10 runs per user per hour).
2. **Resolve repo:** Load active sites, build map `domain → /home/theartis/repositories/<domain>`. Resolve `req.body.repo` (domain or site id) to `cwd`. If missing or path not readable, return 400.
3. **Context block:** Build a short text block listing all sites (name, domain, api_url, admin_url, repo_path) and “Current repo for this task: &lt;repo&gt;”. Prepend this to the user prompt so Claude sees all domains every run.
4. **Optional kanban scope:** If `kanban_item_id` is provided, load that card and prepend normalized task context (title, description, column, priority, owner, version target).
5. **Optional docs context:** If `context_files[]` is provided, resolve files safely inside the selected repo, enforce extension/size/count limits, and prepend clipped file content to the prompt.
6. **Spawn:** Run Claude CLI with `--print`, `--dangerously-skip-permissions`, selected model, and full prompt.
7. **SSE:** Stream output (`out`/`err`) and final `done`; `start` now includes `context_files_used` and `kanban_item_id` so the UI confirms what was injected.
8. **Audit:** `/master/*` requests are logged; for `claude-run`, metadata includes selected docs (used/skipped) and kanban linkage.
 
### Context file safeguards

- Allowed extensions: `.md`, `.txt`
- Max selected files per run: 12
- Max file size: 80 KB per file
- Max injected text: 12,000 chars per file and 90,000 chars total
- Path traversal protection: normalized repo-relative paths only; files outside repo are rejected

### Spawn details

Run the Claude CLI binary (`CLAUDE_BIN`) with:
   - `--print` — print output (no interactive TTY).
   - `--dangerously-skip-permissions` — full autonomy (no allow-list).
   - `--model` — from `MODEL_MAP` (haiku/sonnet/opus).
   - `-p` — the full prompt (context block + user prompt).
   - `cwd` — the chosen repo directory.
   - Env: `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_OAUTH_TOKEN` (from account’s `.credentials.json`), `GH_TOKEN`, `CI=1`, `TERM=dumb`, and various “no update” vars.
One task at a time per server; 409 if a task is already running.

---

## 5. Authentication (Claude Pro OAuth)

The runner uses **Claude Pro (OAuth)** on the server, not `ANTHROPIC_API_KEY`. The API deletes `ANTHROPIC_API_KEY` from the spawn environment so the CLI uses the OAuth session.

- **First-time setup (server):** Either run `claude auth login` in a TTY on the server, or use the Master Hub **Auth Account** flow:
  1. In the Claude tab, open “Auth Account”.
  2. Click **Generate Auth URL**, open the URL in a browser, sign in at claude.ai.
  3. Copy the “Authentication Code” from the callback page and paste it into the dashboard, then **Submit Code**.
- **Credentials:** Stored under the chosen **account dir** (default `/home/theartis/.claude/`):
  - `.credentials.json` — OAuth tokens (format expected by Claude CLI).
  - `.claude.json` — optional; `oauthAccount` is written after profile fetch for display (email, etc.).
- **Multi-account:** Set env vars like `CLAUDE_CONFIG_DIR_WORK=/home/theartis/.claude-work`. The dashboard lists all `CLAUDE_CONFIG_DIR_*` as account options.

---

## 6. Safeguards

- **Master-only access:** `requireMaster` on all `/master/*` routes except `GET /master/me`. Frontend hides “Master Hub” for non-master and redirects direct visits to `/admin/master` to the dashboard with “Kun master-brugere har adgang”.
- **Audit log:** Table `master_audit_log` (user_id, email, path, method, meta, ip, created_at). For `POST /master/claude-run`, meta includes repo, taskId, prompt_length, prompt_preview. Implemented in [api/src/routes/master.js](../api/src/routes/master.js) (middleware that runs on every master route).
- **Rate limiting:** `POST /master/claude-run` is limited per user per hour (default 10; env `MASTER_CLAUDE_RUN_LIMIT`). Response 429 with message “For mange Claude-kørsler. Prøv igen om en time.” and code `CLAUDE_RUN_RATE_LIMIT`.
- **Optional IP allow-list:** If `MASTER_ALLOWED_IPS` (comma-separated) is set, only those IPs can reach any `/master/*` endpoint; others get 403 `IP_NOT_ALLOWED`.

---

## 7. Configuration and environment

| Variable | Purpose |
|----------|---------|
| (none) | Claude CLI binary path is hardcoded: `CLAUDE_BIN = '/home/theartis/local/bin/claude'`. |
| `GITHUB_PAT` | Passed as `GH_TOKEN` to the CLI so it can push and use `gh` (e.g. for deploy). |
| `MASTER_CLAUDE_RUN_LIMIT` | Max claude-run requests per user per hour (default 10). |
| `MASTER_ALLOWED_IPS` | Optional comma-separated IPs; only these can call `/master/*`. |
| `CLAUDE_CONFIG_DIR_*` | Additional account dirs shown in the account dropdown (e.g. `CLAUDE_CONFIG_DIR_WORK`). |

Repo path convention is fixed: `/home/theartis/repositories/<domain>` where `domain` comes from the `sites` table. No env override for repo base path in the current implementation.

---

## 8. Database and schema

- **sites:** Used to build the repo list and cwd. Required columns for Claude: `id`, `name`, `domain`, `api_url`, `admin_url`, `is_active`. Repo path is not stored; it is derived as `REPO_BASE + '/' + domain`.
- **users:** Must include role `master`. Run [api/src/schema_master_role.sql](../api/src/schema_master_role.sql) to extend `role` to `ENUM('user','admin','master')`, then set `role = 'master'` for allowed users.
- **master_audit_log:** Required for audit. Run [api/src/schema_master_audit.sql](../api/src/schema_master_audit.sql) to create it.

---

## 9. Frontend (Claude tab) — behaviour

- **Repo dropdown:** Filled from `GET /master/claude-repos` when the Claude tab is shown. Value is `domain` (used as `repo` in claude-run).
- **Models:** Haiku 4.5 (fast/cheap), Sonnet 4.6 (default), Opus 4.6 (powerful). Sent as `model` in the request body; backend maps to CLI model IDs.
- **Account:** Dropdown from `GET /master/claude-accounts`; auth status from `GET /master/claude-auth-status?account_dir=...`. Green dot = authenticated, amber = expired, grey = not authenticated.
- **Kanban task selector:** Dropdown populated from `/master/kanban` (open columns). Optional `Insert task in prompt` helper adds a structured task header in the textarea.
- **Docs context selector:** File list loaded from `GET /master/claude-context-files?repo=...`, with search/filter + multi-select + selected count.
- **Run:** `runClaude()` POSTs to `/master/claude-run` with `prompt`, `repo`, `model`, `account_dir`, `timeout_min`, and optional `context_files[]` + `kanban_item_id`. Reads SSE; displays stdout in green, stderr in amber; detects “limit” messages and shows purple “Usage limit reached”.
- **Kill:** Sends `DELETE /master/claude-run/:taskId` with the task id from the `X-Task-Id` response header.

---

## 10. Troubleshooting

- **403 Master access required:** User is not `role = 'master'`. Check `users.role` and JWT (re-login after DB change).
- **403 IP_NOT_ALLOWED:** Server has `MASTER_ALLOWED_IPS` set and the client IP is not in the list. Use `X-Forwarded-For` on the server if behind a proxy.
- **429 For mange Claude-kørsler:** Rate limit hit. Wait until the next hour or increase `MASTER_CLAUDE_RUN_LIMIT`.
- **409 A task is already running:** Only one claude-run at a time per server. Kill the current task or wait for it to finish.
- **400 Repo path not found:** The chosen site’s repo path (`/home/theartis/repositories/<domain>`) does not exist or is not readable on the server. Create the directory or fix permissions.
- **SSE not streaming / No response body:** Some proxies or clients buffer SSE. Ensure `X-Accel-Buffering: no` is set (already in code) and that the server/proxy does not buffer the response.
- **Claude CLI not found:** Ensure `CLAUDE_BIN` exists on the server (e.g. `/home/theartis/local/bin/claude`) and is the correct wrapper/version (Node 22).
- **Token expired / Not authenticated:** Re-run the Auth Account flow (Generate Auth URL → open URL → paste code → Submit Code) for the chosen account dir.

---

## 11. File reference

| File | Role |
|------|------|
| [api/src/routes/master.js](../api/src/routes/master.js) | Claude routes, spawn, SSE, OAuth flow, audit, IP check. |
| [api/src/middleware/auth.js](../api/src/middleware/auth.js) | `requireAuth`, `requireMaster`. |
| [api/src/middleware/rateLimit.js](../api/src/middleware/rateLimit.js) | `claudeRunRateLimiter`. |
| [api/src/schema_master_role.sql](../api/src/schema_master_role.sql) | Add `master` to `users.role`. |
| [api/src/schema_master_audit.sql](api/src/schema_master_audit.sql) | Create `master_audit_log`. |
| [api/src/schema_master.sql](../api/src/schema_master.sql) | `sites`, `kanban_items`, etc. |
| [src/pages/admin/master.astro](../src/pages/admin/master.astro) | Master Hub UI and Claude tab (repo, model, account, prompt, output). |
| [src/layouts/AdminLayout.astro](../src/layouts/AdminLayout.astro) | Hides “Master Hub” link for non-master. |
| [src/pages/admin/dashboard.astro](../src/pages/admin/dashboard.astro) | Shows “Kun master-brugere har adgang” when redirected with `?message=master_required`. |

---

## 12. Senior review: best-practice checklist

The junior design is functionally good, but for production-grade operator UX, these are required:

1. **Task-scoped runs**: connect Claude runs to a kanban task id so execution intent is explicit and auditable.
2. **Deterministic context selection**: let users choose exact docs per run; do not inject every file by default.
3. **Prompt-context safety limits**: enforce hard limits on file count/size/total chars to avoid runaway token usage.
4. **Path safety**: only allow repo-relative docs with extension allow-list to block traversal and accidental secret reads.
5. **Run-time confirmation**: return selected docs/task in SSE `start` event so operators can verify context before trusting output.
6. **Audit metadata quality**: include docs used/skipped and kanban linkage in `master_audit_log` for post-mortems.

This is now reflected in the implemented API/UI flow above.

---

## 13. Kanban and documentation task

A Kanban item **“Document Claude Code integration”** can be added to the **in progress** column so the board reflects that this integration is documented. To add it on a deployed system, run:

```sql
INSERT INTO kanban_items (title, description, column_name, priority, assigned_to, sort_order)
VALUES (
  'Document Claude Code integration',
  'Full reference doc: docs/CLAUDE_CODE_INTEGRATION.md. Covers architecture, API, auth, safeguards, env, troubleshooting.',
  'in_progress',
  'medium',
  'human',
  5
);
```

Or run the seed file [api/src/seed_kanban_claude_doc.sql](../api/src/seed_kanban_claude_doc.sql).
