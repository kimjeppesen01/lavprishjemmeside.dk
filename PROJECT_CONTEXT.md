# lavprishjemmeside.dk — Full Project Context

## Overview
A Danish business website offering affordable web development services. Built as a static Multi-Page Application (MPA) using Astro + Tailwind CSS, with a Node.js Express API backend, deployed to a Nordicway cPanel server via automated CI/CD.

**Live URL**: https://lavprishjemmeside.dk
**API URL**: https://api.lavprishjemmeside.dk
**GitHub**: https://github.com/kimjeppesen01/lavprishjemmeside.dk (public)

---

## Tech Stack
- **Frontend**: Astro v5.17+ (static site generator)
- **CSS**: Tailwind CSS v4 (using `@tailwindcss/vite` plugin, NOT the older PostCSS approach)
- **API**: Node.js Express (CommonJS, `.cjs` files) in `api/` subfolder
- **Database**: MySQL (`theartis_lavpris`, user `theartis_lavapi`)
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **Email**: Resend API via Nodemailer (3,000 emails/month free tier)
- **Integrations**: `@astrojs/sitemap` for auto-generated sitemaps
- **Language**: TypeScript (strict mode) for Astro, CommonJS for API
- **Hosting**: cPanel on Nordicway (LiteSpeed web server)
- **CI/CD**: GitHub Actions → SSH deploy to cPanel
- **Analytics**: Google Analytics GA4 (`G-GWCL1R11WP`) + custom event tracker
- **SEO**: Google Search Console (verified via HTML meta tag)

---

## Hosting & Server Details
| Key | Value |
|-----|-------|
| cPanel server | `cp10.nordicway.dk` |
| SSH port | `33` |
| cPanel username | `theartis` |
| Server IP | `176.9.90.24` |
| Domain document root | `/home/theartis/lavprishjemmeside.dk/` |
| API document root | `/home/theartis/api.lavprishjemmeside.dk/` |
| Git repo on server | `/home/theartis/repositories/lavprishjemmeside.dk/` |
| SSL | AutoSSL (Let's Encrypt), HTTPS forced |
| Nameservers | `ns3.nordicway.dk`, `ns4.nordicway.dk` |
| Node.js version | 22 (via cPanel Setup Node.js App) |

**Important**: The same cPanel account hosts a WordPress site on a different domain using `public_html`. Never write to `public_html`.

---

## CRITICAL: cPanel + LiteSpeed + Node.js Gotchas

> **READ THIS SECTION CAREFULLY.** These issues cost hours to debug. They apply to ANY project on cPanel with LiteSpeed and Node.js.

### 1. Restarting Node.js Apps on LiteSpeed
LiteSpeed uses `lsnode:` processes (NOT traditional Passenger). Different restart methods work in different contexts:

**For GitHub Actions deployment:**
```bash
mkdir -p tmp && touch tmp/restart.txt
```
- Use ONLY `tmp/restart.txt` — **DO NOT use pkill in GitHub Actions**
- pkill causes SSH action to fail with exit code 143 (TERM signal)
- After touching `tmp/restart.txt`, run an API health smoke test (`/health`) before marking deploy successful

**For manual SSH restarts:**
```bash
pkill -f 'lsnode:.*<app-directory-name>'
# LiteSpeed will auto-restart the app on the next HTTP request
```
- pkill works fine for manual operations via SSH
- cPanel "Stop/Start" button is **UNRELIABLE** — prefer SSH pkill

### 2. ESM vs CommonJS Conflict
Astro's root `package.json` has `"type": "module"`. If you have a Node.js API in a subfolder:
- **Node 22 will treat ALL `.js` files as ESM** based on the nearest parent `package.json`
- Even if the API's own `package.json` has `"type": "commonjs"`, Node may still read the root one
- **Solution: Use `.cjs` file extension** for all API files (e.g., `server.cjs`)
- The `PassengerStartupFile` in `.htaccess` must also reference the `.cjs` file

### 3. Environment Variables (.env)
- The `.env` file must be created MANUALLY on the server (it's gitignored)
- `git reset --hard` does NOT delete untracked files like `.env`, but always verify
- Use `DB_HOST=127.0.0.1` instead of `localhost` — `localhost` may try Unix socket which can fail in LiteSpeed's environment
- `dotenv` must use an absolute path to find `.env` when Passenger/LiteSpeed starts the app from a different working directory:
  ```js
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  ```
- Do NOT set environment variables in cPanel's Node.js App UI — they can get malformed (empty variable names) and cause `export: '=value': not a valid identifier` errors

### 4. Node.js Version in SSH
- Default `node` in SSH is v10 (ancient) — most npm packages won't work
- The cPanel Node.js app uses a virtual environment with the correct version
- To use the right Node.js version in SSH:
  ```bash
  # Option 1: Full path
  /opt/alt/alt-nodejs22/root/usr/bin/node script.js

  # Option 2: Activate virtual environment
  source /home/theartis/nodevenv/repositories/lavprishjemmeside.dk/api/22/bin/activate
  ```

### 5. Stale Processes
- When debugging, always check for stale `lsnode:` processes: `ps aux | grep node`
- Multiple processes can run simultaneously, serving old code
- Kill ALL of them before testing: `pkill -f 'lsnode:.*lavprishjemmeside'`

### 6. Debugging Node.js Apps on cPanel
- Error logs: `cat ~/repositories/<project>/api/stderr.log`
- Clear and re-check: `> ~/repositories/<project>/api/stderr.log` then trigger a request
- Test DB connection from SSH:
  ```bash
  /opt/alt/alt-nodejs22/root/usr/bin/node -e "require('dotenv').config(); const m=require('mysql2/promise'); m.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME}).then(()=>console.log('OK')).catch(e=>console.log(e.message))"
  ```

### 7. cPanel Git Version Control
- The "Update from Remote" button sometimes gets stuck — use SSH: `cd ~/repositories/<project> && git fetch origin && git reset --hard origin/main`
- The `.cpanel.yml` file exists as a backup mechanism, but the SSH deploy step in GitHub Actions is the actual deploy

---

## CI/CD Pipeline (GitHub Actions)

**Workflow file**: `.github/workflows/deploy.yml`

**Flow**:
1. Push to `main` branch triggers the workflow
2. GitHub Actions checks out code, installs deps (`npm ci`), runs `npm run build`
3. The built `dist/` folder is committed back to `main` by the `github-actions` bot
4. SSH into cPanel server using `appleboy/ssh-action@v1`
5. On the server:
   - `git fetch origin && git reset --hard origin/main`
   - `cp -Rf dist/* ~/lavprishjemmeside.dk/` (deploy frontend)
   - `cd api && npm ci --omit=dev || npm install --production` (deterministic API deps, fallback for older environments)
   - `mkdir -p tmp && touch tmp/restart.txt` (signal restart)
   - `curl https://api.lavprishjemmeside.dk/health` retry loop (deploy fails if API does not recover)

**GitHub Secrets** (configured on the repo):
- `FTP_SERVER` — `176.9.90.24`
- `FTP_USERNAME` — `theartis`
- `SSH_PORT` — `33`
- `SSH_PRIVATE_KEY` — ed25519 private key for SSH deploy

**Optional GitHub Variables** (for multi-domain):
- `PUBLIC_SITE_URL` — site URL used at build time
- `PUBLIC_API_URL` — API URL used at build time
- `DEPLOY_REPO_PATH` — server repo path (default `repositories/lavprishjemmeside.dk`)
- `DEPLOY_SITE_ROOT` — server web root (default `lavprishjemmeside.dk`)
- `DEPLOY_API_HEALTH_URL` — post-deploy health endpoint (default `https://api.lavprishjemmeside.dk/health`)

**Known quirks**:
- Always `git pull --rebase` locally before pushing, because GitHub Actions commits `dist/` back to `main`

---

## Project Structure

```
lavprishjemmeside.dk/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline
├── .cpanel.yml                      # cPanel deploy config (backup)
├── astro.config.mjs                 # Astro config (site URL, Tailwind, sitemap)
├── package.json                     # Root: "type": "module" (Astro)
├── package-lock.json
├── tsconfig.json
├── PROJECT_CONTEXT.md               # This file
├── dist/                            # Built output (committed by GitHub Actions)
├── public/
│   ├── favicon.ico
│   └── favicon.svg
├── api/                             # Node.js Express API
│   ├── .env                         # DB credentials, JWT secret (gitignored, manual on server)
│   ├── .env.example                 # Template for .env
│   ├── package.json                 # "type": "commonjs"
│   ├── package-lock.json
│   ├── server.cjs                   # Express entry point (MUST be .cjs, not .js)
│   ├── src/
│   │   ├── db.js                    # MySQL2 connection pool
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification (admin role required)
│   │   │   ├── logger.js            # Request logging to security_logs table
│   │   │   ├── rateLimit.js         # Rate limiting (login: 5/15min, events: 100/15min, password reset: 3/15min)
│   │   │   └── cache.js             # Query caching (60s TTL) + invalidation
│   │   ├── routes/
│   │   │   ├── health.js            # GET /health (DB connectivity check)
│   │   │   ├── events.js            # POST /events (public), GET /events/summary (admin)
│   │   │   ├── sessions.js          # GET /sessions/summary (admin)
│   │   │   └── auth.js              # POST /auth/login, /register, /forgot-password, /reset-password, GET /auth/me
│   │   ├── services/
│   │   │   └── email.js             # Nodemailer + Resend SMTP transporter, sendEmail() helper
│   │   ├── templates/
│   │   │   └── passwordReset.js     # Danish HTML/text email template for password reset
│   │   ├── schema.sql               # Base schema; schema_phase6.sql (components), schema_password_reset.sql
│   │   ├── seed_components_v2.sql   # Full component seed (run after schema_phase6)
│   │   ├── seed_components_incremental.sql # Incremental updates when DB already seeded
│   │   └── schema_indexes.sql       # Production indexes
│   └── tmp/
│       └── restart.txt              # Touched to signal app restart
├── personal-agent/                  # IAN (Slack AI)
│   ├── agent/
│   ├── slack/
│   ├── projects/
│   │   └── lavprishjemmeside.md     # Product context for client channels
│   └── .env                         # SLACK_*, ANTHROPIC_*, SLACK_CLIENT_CHANNELS (gitignored)
└── src/
    ├── styles/
    │   └── global.css               # Tailwind v4: `@import "tailwindcss";`
    ├── layouts/
    │   ├── Layout.astro             # Public layout (Danish, SEO, GA4, Search Console, Tracker)
    │   └── AdminLayout.astro        # Admin layout (auth guard, sidebar, noindex, no GA4)
    ├── components/
    │   ├── Header.astro             # Nav bar
    │   ├── Footer.astro             # 3-column footer
    │   ├── Tracker.astro            # Event tracker (sendBeacon to API)
    │   ├── OverlapImageSection.astro # Teal/white section, image overlap (bottomDivider: none/straight)
    │   └── AlternatingFeatureList.astro # 2–4 overlap sections as one block; themes alternate
    └── pages/
        ├── index.astro              # Homepage (hero, features, CTA)
        └── admin/
            ├── index.astro          # Admin login page (/admin/)
            ├── forgot-password.astro # Password reset request page
            ├── reset-password.astro  # Password reset form page (token from URL)
            └── dashboard.astro      # Dashboard overview (/admin/dashboard/)
```

---

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/health` | None | Status check + DB connectivity |
| `POST` | `/events` | None | Track pageviews/clicks from frontend |
| `GET` | `/events/summary` | JWT (admin) | Dashboard: total, today, top 10 events, last 20 events |
| `GET` | `/sessions/summary` | JWT (admin) | Dashboard: total, today, avg pages, top landing pages, last 20 sessions |
| `POST` | `/auth/login` | None | Returns JWT token |
| `POST` | `/auth/register` | JWT (admin) | Create new user |
| `GET` | `/auth/me` | JWT | Get current user info |
| `POST` | `/auth/forgot-password` | None | Send password reset email (rate limited: 3/15min) |
| `POST` | `/auth/reset-password` | None | Reset password with token, returns JWT for auto-login |

**Admin credentials**: `info@lavprishjemmeside.dk` / (set via password reset)

---

## Database Schema (MySQL: `theartis_lavpris`)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `events` | Pageviews, clicks, funnels | event_type, event_name, page_url, session_id, metadata (JSON) |
| `users` | Admin/user credentials | email, password_hash, role (user/admin) |
| `content_pages` | Track pages and SEO status | path, title, status (draft/published/archived) |
| `security_logs` | Login attempts, API access | action, ip_address, user_id, details (JSON) |
| `sessions` | Visitor sessions | session_id, first_page, last_page, page_count |
| `password_reset_tokens` | Password reset tokens | token (unique), user_id, expires_at, used_at, ip_address |

---

## Frontend Event Tracking

The `Tracker.astro` component (included in Layout) automatically tracks:
- **Pageviews**: Fires on every page load
- **Clicks**: Fires on any element with a `data-track` attribute

Usage in Astro templates:
```html
<a href="/kontakt" data-track="hero-cta-tilbud">Få et gratis tilbud</a>
```

The tracker uses `navigator.sendBeacon()` for reliable delivery (falls back to `fetch` with `keepalive`).

---

## Section Background Alternation (standardized)

**Purpose**: Reduce "wall of white" and add visual rhythm across the site. Modern web practice: alternate between two background colors (page + alt) for content sections.

**Implementation**:
- **CSS classes**: `section-bg-page` (white) and `section-bg-alt` (light gray, `--color-bg-section-alt`)
- **Alternating order**: First section = page, second = alt, third = page, etc.
- **Where applied**:
  - `[...slug].astro`: Each page component is wrapped in a `<div class="section-bg-page|section-bg-alt">` based on index
  - `index.astro`, `component-test.astro`: Sections use the same classes explicitly
- **Components that override**: CtaSection (`backgroundColor: 'primary'`), StatsBanner (`backgroundColor: 'primary'`), HeroSection with `backgroundImage` — these set their own full background and sit atop the wrapper
- **Components that inherit**: Most content sections (FeaturesGrid, IconCards, TestimonialsCarousel, NewsletterSignup, etc.) have no section-level background; they inherit from the wrapper
- **Theme tokens**: `--color-bg-page` (default `#FFFFFF`), `--color-bg-section-alt` (default `var(--color-neutral-50)`)

**When building new content** (AI-assemble or manual):
- Component order in `page_components` determines alternation (first = page, second = alt, …)
- Use `backgroundColor: 'primary'` only for accent blocks (CTA, stats callout)
- Do NOT add section-level backgrounds to new components; let the wrapper control alternation
- See `api/src/component-docs/_COMPONENT_LIBRARY_INDEX.md` for component-specific `backgroundColor` options

---

## Admin Dashboard

**URL**: `https://lavprishjemmeside.dk/admin/`

The admin dashboard lives within the main Astro site (NOT a separate subdomain), avoiding extra cPanel setup. All `/admin/*` pages are excluded from the sitemap and have `noindex, nofollow` meta tags.

### Architecture
- **AdminLayout.astro**: Separate layout — no public Header/Footer/Tracker/GA4. Has dark sidebar, top bar with admin email, and logout button.
- **Auth guard**: Inline `<script>` runs before page renders. Checks `localStorage` for `admin_token` (JWT). Redirects to `/admin/` if missing. If token exists and user is on login page, redirects to `/admin/dashboard/`.
- **Client-side rendering**: Dashboard HTML is static (empty templates). All data is fetched client-side with `Authorization: Bearer <token>`. If API returns 401/403, token is cleared and user is redirected to login.
- **CORS**: Works without changes because `/admin/` is on the same origin (`lavprishjemmeside.dk`) as the main site.

### Pages
| Page | Path | Purpose |
|------|------|---------|
| Login | `/admin/` | Email + password form, stores JWT in localStorage |
| Dashboard | `/admin/dashboard/` | 4 metric cards + 3 data tables |
| Master Hub | `/admin/master/` | Multi-site control, Claude Code runner, Kanban, AI usage (master role only) |

### Claude Code integration (Master Hub)

The **Claude Code** tab in Master Hub runs the Claude CLI on the server from the browser: a master user picks a repo (from the `sites` table), enters a prompt, and sees live CLI output via SSE. Claude runs with **full autonomy** (no permission allow-list) and receives an injected **all-domains** context block every run.

- **Access**: Only `role = 'master'` can open `/admin/master` or call `/master/*` APIs. The frontend hides the "Master Hub" link for non-master users and redirects direct visits to the dashboard with "Kun master-brugere har adgang".
- **Safeguards**: Master-only middleware; audit log (`master_audit_log`) for every `/master/*` request; rate limit on `POST /master/claude-run` (default 10/hour per user, `MASTER_CLAUDE_RUN_LIMIT`); optional `MASTER_ALLOWED_IPS` IP allow-list.
- **Schema**: Run `api/src/schema_master_role.sql` (add `master` to `users.role`) and `api/src/schema_master_audit.sql` (create `master_audit_log`). Assign `role = 'master'` to a user to grant access.

**Full reference:** For architecture, API endpoints, OAuth setup, env vars, troubleshooting, and file locations, see **[docs/CLAUDE_CODE_INTEGRATION.md](docs/CLAUDE_CODE_INTEGRATION.md)**.

### Dashboard Overview Shows
- **4 metric cards**: Hændelser i alt, Hændelser i dag, Sessioner i alt, Gns. sider pr. session
- **Top hændelser table**: Event name, type, count (top 10)
- **Top landingssider table**: First page URL, session count (top 10)
- **Seneste hændelser table**: Type, name, page URL, timestamp (last 20)

### What's Built (Infrastructure)
- Login/logout with JWT (24h expiry)
- Overview dashboard with live data from API
- Sessions summary API endpoint
- Sitemap exclusion + noindex meta
- Auth guard with auto-redirect
- Auto-logout on expired/invalid token
- **Rate limiting**: 5 login attempts/15min, 100 events/15min (express-rate-limit)
- **Query caching**: 60s TTL with auto-invalidation on writes (node-cache)
- **Database indexes**: idx_last_activity (sessions), idx_created_at_action (security_logs composite)

### What Needs to Be Implemented

Implementation items are organized by priority: **Critical** (security/performance), **High** (core features), **Medium** (UX enhancements), and **Nice-to-Have** (polish).

---

#### 🔴 CRITICAL: Security & Performance

**Automated Log Rotation**
- `security_logs` table will grow rapidly
- Create cron job or scheduled API endpoint to archive/delete logs older than 60 days
- Prevent database bloat

**Change Default Admin Password**
- Current password is `change_me_immediately` — MUST be changed immediately
- Force password change on first login or add to deployment checklist

---

#### 🟠 HIGH PRIORITY: Core Dashboard Features

**Date Range Filtering**
- Add date picker UI component to dashboard
- Update `/events/summary` and `/sessions/summary` to accept `?from=&to=` query params
- Default to "last 30 days" instead of all-time

**Security Logs Page** (`/admin/sikkerhed/`)
- Create `GET /security-logs` endpoint with filters (action, date range, user)
- Build page to view login attempts, API access, and suspicious activity
- Show IP addresses, user agents, timestamps

**User Management** (`/admin/brugere/`)
- Build UI to list all users with roles
- Add ability to create new admin users (use existing `POST /auth/register`)
- Add `GET /users` and `DELETE /users/:id` endpoints
- Implement **soft deletes**: Add `deleted_at` column to `users` table for audit trails

**Content Pages Management** (`/admin/sider/`)
- CRUD API for `content_pages` table: `GET`, `POST`, `DELETE /content-pages/:id`
- UI to manage page status (draft/published/archived)
- Track SEO title, description, and last deployment timestamp

**Change Password Feature**
- Create `PUT /auth/password` endpoint (requires current password + new password)
- Add settings page or modal in dashboard
- Hash with bcrypt, update `users.password_hash`

---

#### 🟡 MEDIUM PRIORITY: UX & Analytics

**Charts/Trends Visualization**
- Add visual graphs for events per day, sessions over time
- Use lightweight library (Chart.js or similar)
- Show traffic trends, bounce rates, conversion funnels

**Session Detail View**
- Drill into individual sessions to see full page flow
- Show: first page → navigation path → exit page
- Display session duration, page count, device/browser

**Global Toast Notifications**
- Replace silent redirects with visual feedback toasts
- Show success/error messages for CRUD operations
- Use a lightweight toast library or custom component

**Auto-Refresh Dashboard**
- Add periodic refresh (every 60 seconds) or manual refresh button
- Update metric cards without full page reload
- Show "Last updated: X seconds ago" timestamp

**Mobile-Responsive Admin**
- Improve sidebar collapse/hamburger menu on mobile
- Ensure metric cards stack cleanly on small screens
- Test horizontal scrolling for data tables

**Data Export (CSV)**
- Add "Export CSV" buttons to events and sessions tables
- Generate CSV client-side or via API endpoint
- Include filters/date range in export

---

#### 🟢 NICE-TO-HAVE: Advanced Features

**UTM Parameter Tracking**
- Automatically capture `?utm_source=`, `?utm_campaign=`, `?utm_medium=` from URLs
- Store in `sessions` table (add columns: `utm_source`, `utm_campaign`, `utm_medium`)
- Dashboard shows which marketing channels drive traffic

**Core Web Vitals Tracking**
- Expand `Tracker.astro` to capture First Contentful Paint (FCP), Cumulative Layout Shift (CLS)
- Send as metadata in `POST /events` payload
- Show performance metrics in dashboard (useful for a web dev business to dogfood)

**Client-Side Error Tracking**
- Catch JavaScript errors and send to API as `error` event type
- Store stack traces in `events.metadata` JSON
- Debug frontend issues directly from admin panel

**Keyboard Navigation & ARIA**
- Ensure all interactive elements (date picker, charts, pagination) are keyboard-accessible
- Add proper ARIA labels for screen readers
- Test with keyboard-only navigation

**System-Aware Dark Mode**
- Full application-wide dark mode toggle
- Respect OS-level `prefers-color-scheme` media query
- Store user preference in localStorage

---

#### API Endpoints Summary (New/Updated)

| Method | Endpoint | Auth | Purpose | Priority | Status |
|--------|----------|------|---------|----------|--------|
| `GET` | `/events/summary` | JWT (admin) | Add `?from=&to=` date params | 🟠 High | Needs update |
| `GET` | `/sessions/summary` | JWT (admin) | Add `?from=&to=` date params | 🟠 High | Needs update |
| `GET` | `/security-logs` | JWT (admin) | List security logs with filters | 🟠 High | Not built |
| `GET` | `/users` | JWT (admin) | List all users | 🟠 High | Not built |
| `POST` | `/content-pages` | JWT (admin) | Create/update page entry | 🟠 High | Not built |
| `GET` | `/content-pages` | JWT (admin) | List content pages | 🟠 High | Not built |
| `DELETE` | `/content-pages/:id` | JWT (admin) | Delete page entry | 🟠 High | Not built |
| `DELETE` | `/users/:id` | JWT (admin) | Soft delete user | 🟠 High | Not built |
| `PUT` | `/auth/password` | JWT | Change own password | 🟠 High | Not built |

---

## Setting Up a New Project (Client Template)

When replicating this setup for a new client on cPanel/LiteSpeed:

### 1. Create the Astro project locally
```bash
npm create astro@latest client-domain.dk
cd client-domain.dk
npx astro add tailwind  # Use @tailwindcss/vite
npm install @astrojs/sitemap
```

### 2. Create the API subfolder
```bash
mkdir -p api/src/{routes,middleware}
cd api && npm init -y
npm install express mysql2 bcrypt jsonwebtoken cors dotenv helmet
```
- Set `"type": "commonjs"` in `api/package.json`
- Name the entry point `server.cjs` (NOT `.js`)
- Use `path.join(__dirname, '.env')` in dotenv config

### 3. cPanel Setup
1. **Domain**: Add domain/subdomain in cPanel → Domains
2. **Git repo**: cPanel → Git Version Control → clone from GitHub
3. **MySQL**: Create database + user in cPanel → MySQL Databases
4. **API subdomain**: Create `api.client-domain.dk` in cPanel → Domains
5. **Node.js app**: cPanel → Setup Node.js App:
   - Root: `repositories/client-domain.dk/api`
   - Startup file: `server.cjs`
   - URL: `api.client-domain.dk`
   - Node version: 22+
6. **SSH .env**: Create `.env` on server at `~/repositories/client-domain.dk/api/.env`
   - Use `DB_HOST=127.0.0.1` (NOT `localhost`)
7. **Run schema**: phpMyAdmin → SQL tab → paste schema.sql

### 4. GitHub Actions Secrets
Set these in the repo settings:
- `FTP_SERVER` — server IP
- `FTP_USERNAME` — cPanel username
- `SSH_PRIVATE_KEY` — ed25519 private key
- `SSH_PORT` — SSH port (often 33 on Nordicway)

### 5. Deploy Script Must Include
```yaml
script: |
  set -euo pipefail
  cd ~/repositories/client-domain.dk
  git fetch origin
  git reset --hard origin/main
  cp -Rf dist/* ~/client-domain.dk/
  cd api && npm ci --omit=dev || npm install --production
  mkdir -p tmp && touch tmp/restart.txt
  # retry /health and fail deploy if API does not come back
```

**Important**: Do NOT use `pkill` in GitHub Actions deployment — it causes the SSH action to fail with exit code 143 (TERM signal). Use `tmp/restart.txt` + health verification instead.

---

## Development Workflow

1. Edit files locally in `~/lavprishjemmeside.dk/`
2. Test frontend with `npm run dev` (localhost:4321)
3. Test API locally: `cd api && node server.cjs` (localhost:3000)
4. `git pull --rebase` (important — GitHub Actions may have pushed dist/ commits)
5. `git add <files> && git commit -m "message" && git push`
6. GitHub Actions auto-builds and deploys via SSH
7. Site is live within ~60 seconds

---

## Important Notes for AI Agents

- **Tailwind v4**: Uses `@tailwindcss/vite` plugin, NOT the old `@astrojs/tailwind` PostCSS integration. The CSS entry point is `@import "tailwindcss";` in `global.css`.
- **Always commit lockfile**: `package-lock.json` must be committed or builds fail on GitHub.
- **Always pull before push**: GitHub Actions commits `dist/` back to `main`, so local will be behind after every deploy.
- **Danish language**: All user-facing text is in Danish. `<html lang="da">`.
- **Don't touch public_html**: WordPress site lives there for a different domain.
- **API files must be `.cjs`**: The root `package.json` has `"type": "module"` for Astro. Node 22 will treat `.js` files as ESM and crash.
- **Restart in GitHub Actions**: Use ONLY `mkdir -p tmp && touch tmp/restart.txt` — do NOT use pkill (causes exit code 143).
- **Deploy verification**: Workflow must include post-deploy `/health` retries and fail hard if API does not recover.
- **Manual restart via SSH**: `pkill -f 'lsnode:.*lavprishjemmeside'` works fine for manual operations.
- **DB_HOST must be 127.0.0.1**: Using `localhost` can cause Unix socket connection failures in LiteSpeed.
- **dotenv needs absolute path**: Use `path.join(__dirname, '.env')` or the `.env` won't be found when LiteSpeed starts the app.
- **SSH Node version**: Default is v10. Use the virtual env or `/opt/alt/alt-nodejs22/root/usr/bin/node`.
- **zsh quirk**: Use single quotes for values containing `!` in shell commands.
- **Debugging**: Check `~/repositories/<project>/api/stderr.log` for Node.js errors. Clear it before testing: `> stderr.log`.

---

## Completed Phases
- **Phase 1**: Project setup, CI/CD, Layout/Header/Footer, Homepage, SSL/HTTPS, GA4, Search Console, Sitemap
- **Phase 2**: Express API, MySQL database (5 tables), JWT auth, event tracking, deploy pipeline with lsnode restart
- **Phase 3**: Admin dashboard infrastructure — login page, overview dashboard, sessions API, AdminLayout with auth guard
- **Phase 4**: Production infrastructure — rate limiting (5 login/15min, 100 events/15min), query caching (60s TTL), database indexes (sessions.last_activity, security_logs composite)
- **Phase 5**: Email infrastructure & password reset — Resend API integration, forgot-password and reset-password pages, password_reset_tokens table (60-min expiry, rate limited 3/15min), Danish email templates (HTML + plain text), email enumeration prevention, auto-login after reset
- **Phase 6**: Component library & page builder — 27 components (opener/trust/conversion/content/structure), schema-driven component editor with A/B selectors, boolean toggles, image pickers, repeatable array cards, AI page assembler, design/styling dashboard, dynamic static page rendering from DB. **Overlap module**: AlternatingFeatureList (2–4 sections, teal/white), OverlapImageSection with `withinGroup`/`topOverlap`; no zigzag (bottomDivider: none/straight).

## Developer Documentation

| Doc | Purpose |
|---|---|
| `docs/COMPREHENSIVE_PLAN.md` | **Single consolidated plan** — Merges project context, multi-domain CMS plan, Claude Code integration, and Claude access/safeguards. Vision, architecture, status, roadmap. |
| `docs/COMPONENT_EDITOR.md` | **Full reference for the schema-driven component editor** — schema format, field type mapping, form builder internals, save flow, media picker, adding new components |
| `docs/PHASE_6_Component-Library-&-Styling-Dashboard_v2.md` | **Phase 6 original spec** — Design tokens, DB schema, AI assembly, admin UI. Status: COMPLETED (implementation diverged; see "Implementation vs Spec" in doc). |
| `docs/GLOBAL_FEATURES.md` | Styling features (smooth scroll, korn-overlay, sideloader, sticky header) from Admin → Design & styling |
| `docs/Future_implementations.md` | **Nice-to-have backlog** — Performance (CWV, CDN, caching), security headers, testing, PWA, i18n, analytics. Not critical for MVP. |
| `docs/PHASE_7_AI_GENERATOR_SPEC_v2.md` | **Phase 7 Visual Page Builder** — Mockup → components/HTML via AI Vision. `/admin/byggeklodser`. OpenAI gpt-4o or Anthropic Claude. Full technical spec. |
| `docs/SHOPPING_MODULE_PLAN.md` | **E-commerce module** — Product catalog, Quickpay, cart, checkout. 11 new tables, Danish localization, static product pages + client-side cart. Implementation plan with tickets. |
| `docs/MULTI_DOMAIN_CMS_PLAN.md` | **Multi-domain deployment** — ZIP + 1-click setup, standalone template model, product vision, upstream updates. |
| `docs/DEPLOY_NEW_DOMAIN.md` | **Deploy to new domain** — Step-by-step checklist (cPanel, MySQL, Node.js App, GitHub secrets/vars, schema order). |
| `docs/UPSTREAM_UPDATES.md` | **Upstream updates** — How clients pull upstream, resolve conflicts, redeploy; keep only `api/.env` local. |
| `docs/ROLLOUT_MANUAL.md` | **Rollout manual** — Complete step-by-step human instructions and exact prompts for 1-click setup, new domain (GitHub + cPanel), and main site deploy. |
| `docs/DEPLOY_HEALTHCHECK.md` | **Deploy health runbook** — Post-deploy verification, green/red criteria, SSH recovery steps, and API restart troubleshooting. |
| `docs/IAN_PLAN.md` | **IAN client support AI** — Slack-based AI for client channels. Implementation, integration ideas (admin, AI-assembler, Shopping, Pro, multi-domain). |

---

## Global Features

Styling-funktioner (smooth scroll, korn-overlay, sideloader, klæbende header) styres fra Admin → Design & styling. Se `docs/GLOBAL_FEATURES.md` for beskrivelse.

---

## Pending
- **Component editor UX**: Re-ordering of array items (drag-and-drop or up/down arrows)
- **Component variations**: Add A/B content variant support per page component instance
- **Dashboard enhancements**: Date filtering, charts, auto-refresh, CSV export (see Admin Dashboard section above)
- **Dashboard pages**: Security logs, content management, user management, session detail view
- **Public pages**: Priser, Om os, Kontakt
- **SEO content optimization**

## Planned Modules

### Shopping Module (E-commerce)
**Spec**: [docs/SHOPPING_MODULE_PLAN.md](docs/SHOPPING_MODULE_PLAN.md)

Full e-commerce: product catalog, Quickpay (Dankort, Visa/MC, MobilePay), cart, checkout. Static product pages (SSG) + client-side cart (localStorage). 11 new DB tables (products, variants, orders, customers, shipping, discounts, etc.). Admin at `/admin/shop/` (products, orders, settings). Danish localization (øre pricing, moms, shipping). Integrates with existing media table and AI toolkit (`product-grid`, `shop-hero` components).

### IAN — Client Support AI
**Spec**: [docs/IAN_PLAN.md](docs/IAN_PLAN.md) | **Product context**: [personal-agent/projects/lavprishjemmeside.md](personal-agent/projects/lavprishjemmeside.md)

IAN lives in `personal-agent/` within this repo. Slack-based AI that monitors client channels and answers product questions. Stays silent when owner chats directly with clients. Run: `cd personal-agent && source .venv/bin/activate && python -m agent.main`. Supports multi-client via `SLACK_CLIENT_CHANNELS`. Integration ideas: admin widget, AI-assembler link, product-context sync, future Shopping/Pro/multi-domain support — see IAN_PLAN.md.

### Future Implementations (Nice-to-Have)
**Spec**: [docs/Future_implementations.md](docs/Future_implementations.md)

Deferred items: WCAG audit (AI will handle), Core Web Vitals tracking, error monitoring (Sentry), performance budget, testing suite, PWA, i18n. Security headers recommended before white-label launch. Pragmatic: build MVP fast, add as needed.

---

## Phase 6: Component Library & Page Builder (Implemented)

**Status: LIVE** — core functionality complete, actively being extended.

**Spec (original plan)**: [docs/PHASE_6_Component-Library-&-Styling-Dashboard_v2.md](docs/PHASE_6_Component-Library-&-Styling-Dashboard_v2.md) — marked COMPLETED; implementation diverged (27 components vs 18 planned).  
**Full technical reference:** [docs/COMPONENT_EDITOR.md](docs/COMPONENT_EDITOR.md)

### Architecture

Database-driven content + static generation:
1. Admin builds/edits pages at `/admin/pages/` → saved to `page_components` table
2. "Publicer" triggers GitHub Actions → `npm run build` → Astro reads DB → static HTML
3. Public site is fully static (SEO-friendly, fast, zero admin JS overhead)

### Database tables (Phase 6)

| Table | Purpose |
|---|---|
| `components` | Template library — 27 components with `schema_fields` JSON, `default_content`, category ENUM |
| `page_components` | Content instances per page — `content` JSON, `sort_order`, `is_published` |
| `design_settings` | Color palette, typography, border radius, shadow style (one row per site) |
| `theme_presets` | Business / Vibrant / Minimalistic full-config presets |

### Component library (27 components)

| Category | Components |
|---|---|
| `opener` | hero-section |
| `trust` | stats-banner, testimonials-carousel, team-grid, trust-badges-section, logo-cloud |
| `conversion` | cta-section, pricing-table, comparison-table, contact-form, newsletter-signup |
| `content` | problem-section, how-it-works-section, case-studies-section, overlap-image-section, overlap-cards-section, alternating-feature-list, features-grid, icon-cards, content-image-split, video-embed, timeline, product-carousel, sticky-column-section, bento-grid-section, tabs-section, modal-section, founders-note-section, integrations-section |
| `structure` | breadcrumbs |

### Key files

| File | Role |
|---|---|
| `src/pages/admin/pages.astro` | Page builder UI + schema-driven component editor (form builder, value collector, media picker) |
| `src/pages/[...slug].astro` | Dynamic static page renderer — reads `page_components` from DB at build time |
| `api/src/routes/components.js` | `GET /components` — returns component library (note: `schema_fields` aliased as `default_props`) |
| `api/src/routes/page-components.js` | CRUD for page component instances + publish endpoint |
| `api/src/seed_components_v2.sql` | **Authoritative seed** for all 27 components — run in phpMyAdmin after `schema_phase6.sql` |
| `api/src/seed_components_incremental.sql` | **Here-and-now incremental** — run when DB already seeded; applies latest component updates (overlap module, zigzag removal) |
| `api/src/schema_phase6.sql` | Defines all Phase 6 tables |

### Critical: schema_fields aliasing

`GET /components` aliases `schema_fields` as `default_props`. The editor reads `component.default_props`. If this alias changes, the form builder silently falls back to raw JSON editing for all components.

### Admin Dashboard Structure

| URL | Purpose |
|---|---|
| `/admin/pages/` | Page builder — add/edit/reorder/delete components per page, SEO meta, publish |
| `/admin/components/` | Component catalog — browse library, view documentation |
| `/admin/components/preview/[slug]` | Component preview (e.g. alternating-feature-list) |
| `/admin/styling/` | Design system — color pickers, theme presets, shape/shadow controls |
| `/admin/media/` | Media library — upload and browse images |
| `/admin/ai-assemble/` | AI page assembler — generate full pages from a prompt |

**Client workflow**:
1. Login → `/admin/pages/` → select a page
2. Add component → choose from library → component added with `default_content`
3. Click "Rediger" → schema-driven form opens → edit text, toggle booleans, pick images
4. "Gem ændringer" → saved to DB
5. "Publicer side" → triggers GitHub Actions → static site rebuilt in ~30s

---

### Phase 7: AI Building Block Generator (Premium Feature)

> **Full Technical Specification**: See [docs/PHASE_7_AI_GENERATOR_SPEC_v2.md](docs/PHASE_7_AI_GENERATOR_SPEC_v2.md)

**Status**: Plan — ready for implementation (2–3 weeks). Depends on Phase 6.

**Feature**: AI-powered visual page builder. Upload design mockups → AI (OpenAI gpt-4o or Anthropic Claude) maps to existing components or generates custom HTML using site design tokens.

**Key Innovation**: Dynamic AI context — `/ai/context` loads design tokens from DB + component docs at request time. No hardcoded styles; AI always uses current brand.

**Core Value**:
- Converts design mockups to code in seconds (vs hours manual coding)
- Ensures brand consistency (uses site's actual colors/fonts, not generic Tailwind)
- Reduces client onboarding time (quickly prototype from their designs)
- Premium upsell opportunity (free tier → paid upgrade funnel)

**Workflow**:
1. Upload design mockup image + optional HTML structure
2. Backend loads Context Library (colors, typography, component examples)
3. OpenAI Vision API generates HTML using brand's design system
4. HTML is sanitized and returned to frontend
5. User previews in iframe, copies code, or saves as component template

**Architecture Highlights** (see full spec for implementation):
- **Backend**: `api/src/routes/ai-generate.js` — Multer upload, OpenAI gpt-4o or Anthropic Claude Vision
- **Dynamic context**: `/ai/context` — design tokens from DB + component-docs at request time
- **Output modes**: PRIMARY = `page_components[]` (maps to existing components); SECONDARY = custom HTML with CSS variables
- **Shared infra**: `ai_usage` table (operation: `visual_generation`), `aiRateLimiter` (10/hour with Phase 6)
- **Frontend**: `/admin/byggeklodser` — upload mockup, preview iframe with design tokens, save to page builder

**Implementation Checklist**: See full spec for detailed 3-week implementation plan with testing strategy

**Future Enhancements**:
- Multi-image upload (generate full pages)
- Style transfer between components
- A/B testing variants
- Export to Figma/Sketch

---

## Recent Session Errors & Solutions (Phase 6)

### localStorage Key Mismatch
**Issue:** Admin pages redirect after login - `localStorage.getItem('token')` returns `null`

**Cause:** New pages used `token` but existing system uses `admin_token`

**Fix:** Always use `admin_token` for consistency

### Database Enum Mismatches  
**Issue:** Design settings save fails

**Cause:** HTML select used CSS values instead of enum strings

**Fix:** 
- `border_radius`: none, small, medium, large, full (NOT CSS values)
- `shadow_style`: none, subtle, medium, dramatic (NOT CSS values)

### Internal API fetch() Failures
**Issue:** `fetch failed` error when calling internal endpoints

**Cause:** Node's fetch() can't make internal HTTP calls on cPanel  

**Fix:** Use direct function imports instead of HTTP
```javascript
// ✗ Don't
const res = await fetch(`${API_BASE_URL}/ai/context`);

// ✓ Do  
const { buildAiContext } = require('../services/ai-context');
const context = await buildAiContext();
```

### GitHub Actions --env-file Error
**Issue:** Build fails: `node: .env: not found`

**Fix:** Remove `--env-file` flag from package.json scripts (CI doesn't have .env)

---

## Build Failures 2026-02-15 (Builds #53-#63)

### Summary
All builds from #53 to #63 failed. Root cause: Dynamic page routing system (`[...slug].astro`) attempted to render AI-generated components with **mismatched prop structures**.

**Last successful build:** #52 (commit `9b85f533`)
**Solution:** Force-reverted to build #52

---

### Timeline of Failures

#### Build #53: pkill Added to Deployment
**Commit:** `4f43de01` - "Fix: Add pkill to deployment workflow to ensure API restarts"
**Status:** ❌ FAILED (but not due to pkill)
**Issue:** Deployment script exit code 143 from `pkill -f 'lsnode:.*lavprishjemmeside'`
**Note:** pkill itself was NOT the root cause - this was a red herring

#### Builds #55-#63: Dynamic Page Routing Added
**Commit:** `071669ce` - "Add dynamic page generation from database components"
**Status:** ❌ ALL FAILED
**Root Cause:** Created `src/pages/[...slug].astro` to render pages from database, but:
1. AI generator created `/priser` page with 5 components
2. Component data had **different prop names** than Astro components expected
3. Build crashed with: `Cannot read properties of undefined (reading 'map')`

#### Attempted Fixes (All Failed)
- `0c5d635` - Fixed CORS to allow public API access during build
- `59954c6` - Changed pkill exit code handling with `|| :` and `exit 0`
- `78a3438` - Removed `[...slug].astro` to stop crashes
- `0f8969e` - Documented issue in PROJECT_CONTEXT.md

**All builds continued failing until full revert.**

---

### Root Cause: Component Prop Name Mismatches

The AI generator created page components with **different prop structures** than Astro components expected:

| Component | Component Expects | AI Generated | Result |
|-----------|------------------|--------------|--------|
| **FaqAccordion** | `faqs: Array<{question, answer}>` | `items: Array<{question, answer}>` | ❌ Crash: `faqs` is undefined |
| **PricingTable** | `tiers: Array<{name, price, period, features, cta, featured}>` | `plans: Array<{name, price, period, description, features, cta, popular}>` | ❌ Crash: `tiers` is undefined |
| **ComparisonTable** | `products: string[], features: string[], data: [][]` | `columns: Array<object>, rows: Array<object>` | ❌ Completely different structure |

**Why this happened:**
- Components were built BEFORE AI generator
- AI generator doesn't have access to TypeScript component interfaces
- AI guessed prop names based on common patterns (e.g., "items" for lists)
- No validation layer to catch mismatches before build

---

### What Went Wrong

1. **No prop validation:** `[...slug].astro` passed `pc.content` directly to components without checking structure
2. **No build-time safety:** Astro SSG crashed during build when component received wrong props
3. **AI doesn't know schemas:** Generator creates data based on component descriptions, not actual TypeScript interfaces
4. **No fallback values:** Components crash immediately if required props are missing/wrong type

---

### Build Error Example

```
Building /priser/index.html...
Cannot read properties of undefined (reading 'map')
  Stack trace:
    at Breadcrumbs_u-2nEQlx.mjs:179:504
    at AstroComponentInstance.init
```

**Breakdown:**
- Build tried to render `/priser` page
- One component had `undefined` for a required array prop
- Component tried to call `.map()` on undefined
- Build crashed, deployment failed

---

### Solutions Attempted (Session 2026-02-15)

#### ❌ Solution 1: Fix CORS for build-time API access
**Commit:** `0c5d635`
**Result:** FAILED - This was never the issue

**What was tried:**
- Made `/page-components/public` endpoint accept requests from any origin
- Added dynamic CORS config to allow `*` for public endpoints
- This fixed CORS but didn't fix prop mismatches

**Why it failed:** CORS was a secondary issue; root cause was prop structure

#### ❌ Solution 2: Fix pkill exit codes
**Commit:** `59954c6`
**Result:** FAILED - pkill wasn't causing build failures

**What was tried:**
- Changed `|| true` to `|| :`
- Added `2>/dev/null` to suppress stderr
- Added explicit `exit 0` at end of deploy script

**Why it failed:** Builds were failing during Astro build phase, not deployment phase

#### ❌ Solution 3: Remove dynamic routing
**Commit:** `78a3438`
**Result:** FAILED - Builds still failed even after removing `[...slug].astro`

**Why it failed:** Git cache issues / deployment pipeline hadn't fully reset

#### ✅ Solution 4: Force revert to build #52
**Commit:** `9b85f533` (force-pushed)
**Result:** SUCCESS - Build #64 succeeded

**What worked:**
```bash
git reset --hard 9b85f533
git push --force
```

Completely removed all changes from builds #53-#63, returning to last known working state.

---

### Lessons Learned

#### 1. Don't Add Multiple Features in Failing Build Chain
**Problem:** Added pkill → CORS fixes → prop validation → docs while builds were failing
**Result:** Couldn't isolate which change actually broke things
**Fix:** When builds fail, revert IMMEDIATELY, then add ONE change at a time

#### 2. AI-Generated Data Needs Schema Validation
**Problem:** AI generator creates data without knowing component schemas
**Solution:** Either:
- Add JSON Schema validation before saving to database
- Create prop mapping layer in `[...slug].astro`
- Update AI prompts with exact TypeScript interfaces
- Add fallback props to all components

#### 3. Test Dynamic Routes Locally First
**Problem:** Created `[...slug].astro` and pushed without local testing
**Fix:** ALWAYS test Astro builds locally before pushing:
```bash
npm run build  # Must succeed before git push
```

#### 4. Read PROJECT_CONTEXT.md FIRST
**Problem:** AI didn't know about previous build issues or project patterns
**Fix:** ALWAYS read PROJECT_CONTEXT.md at start of session (now enforced in MEMORY.md)

---

### Current State (2026-02-15, Post Component Hardening)

✅ **Working:**
- All admin pages functional
- AI generator creates pages in database
- Component library complete (27 components)
- Dynamic page rendering from database (`[...slug].astro` restored)
- `normalizeProps()` thin safety net + component safe defaults
- AI prompt includes exact TypeScript schemas
- Design settings save, Live Preview, styling dashboard
- Delete page functionality (`POST /page-components/delete-page`)

❌ **Edge cases:**
- Dynamic pages: 0 generated when API unreachable at build time (fetch fails)

---

## Recent Work (2025–2026): Overlap Module & Zigzag Removal

**AlternatingFeatureList** — New parent component for 2–4 OverlapImageSection blocks as one coherent module. Themes alternate teal/white, image placement alternates left/right, images overlap into the next section.

**OverlapImageSection** — Extended with `withinGroup` (omit spacer when in group) and `topOverlap` (padding for previous image overlap). Zigzag divider removed; `bottomDivider` now `none` or `straight` only.

**Seed workflow** — `seed_components_incremental.sql` for incremental updates when `seed_components_v2.sql` was already run. Uses JSON_OBJECT() to satisfy schema_fields CHECK constraint. Keep both files in sync when changing components.

---

### Implemented Fix (2026-02-15)

**Option 2 + Option 4 applied:**
- AI prompts now include exact TypeScript schemas from component docs (`api/src/services/anthropic.js`)
- All components have safe defaults (`instanceId`, `[]` for arrays, fallback headlines)
- `normalizeProps()` simplified to thin safety net (array checks + default headlines only)

---

### Commands for Next Session

**Delete orphaned `/priser` page:**
1. Go to `/admin/pages`
2. Click 🗑 next to `/priser`
3. Confirm deletion

**Check build status:**
```bash
gh run list --limit 5
```

**Test local build before pushing:**
```bash
npm run build  # Must succeed
```

**Revert if builds fail:**
```bash
git reset --hard <last-working-commit>
git push --force
```
