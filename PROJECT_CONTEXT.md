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
LiteSpeed uses `lsnode:` processes (NOT traditional Passenger). The standard restart methods DO NOT WORK reliably:
- `touch tmp/restart.txt` — **UNRELIABLE**, often does nothing
- cPanel "Stop/Start" button — **UNRELIABLE**, may not actually restart the process

**The ONLY reliable way to restart:**
```bash
pkill -f 'lsnode:.*<app-directory-name>'
# LiteSpeed will auto-restart the app on the next HTTP request
```

The CI/CD deploy script MUST include this kill step. Example:
```bash
pkill -f 'lsnode:.*lavprishjemmeside' || true
```

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
   - `cd api && npm install --production` (install API deps)
   - `pkill -f 'lsnode:.*lavprishjemmeside' || true` (kill stale processes)
   - `mkdir -p tmp && touch tmp/restart.txt` (signal restart)

**GitHub Secrets** (configured on the repo):
- `FTP_SERVER` — `176.9.90.24`
- `FTP_USERNAME` — `theartis`
- `SSH_PORT` — `33`
- `SSH_PRIVATE_KEY` — ed25519 private key for SSH deploy

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
│   │   │   └── logger.js            # Request logging to security_logs table
│   │   ├── routes/
│   │   │   ├── health.js            # GET /health (DB connectivity check)
│   │   │   ├── events.js            # POST /events (public), GET /events/summary (admin)
│   │   │   └── auth.js              # POST /auth/login, POST /auth/register, GET /auth/me
│   │   └── schema.sql               # Database schema (5 tables + admin user seed)
│   └── tmp/
│       └── restart.txt              # Touched to signal app restart
└── src/
    ├── styles/
    │   └── global.css               # Tailwind v4: `@import "tailwindcss";`
    ├── layouts/
    │   └── Layout.astro             # Base layout (Danish, SEO, GA4, Search Console, Tracker)
    ├── components/
    │   ├── Header.astro             # Nav bar
    │   ├── Footer.astro             # 3-column footer
    │   └── Tracker.astro            # Event tracker (sendBeacon to API)
    └── pages/
        └── index.astro              # Homepage (hero, features, CTA)
```

---

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/health` | None | Status check + DB connectivity |
| `POST` | `/events` | None | Track pageviews/clicks from frontend |
| `GET` | `/events/summary` | JWT (admin) | Dashboard: event statistics |
| `GET` | `/sessions/summary` | JWT (admin) | Dashboard: session statistics |
| `POST` | `/auth/login` | None | Returns JWT token |
| `POST` | `/auth/register` | JWT (admin) | Create new user |
| `GET` | `/auth/me` | JWT | Get current user info |

**Admin credentials**: `admin@lavprishjemmeside.dk` / `change_me_immediately`

---

## Database Schema (MySQL: `theartis_lavpris`)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `events` | Pageviews, clicks, funnels | event_type, event_name, page_url, session_id, metadata (JSON) |
| `users` | Admin/user credentials | email, password_hash, role (user/admin) |
| `content_pages` | Track pages and SEO status | path, title, status (draft/published/archived) |
| `security_logs` | Login attempts, API access | action, ip_address, user_id, details (JSON) |
| `sessions` | Visitor sessions | session_id, first_page, last_page, page_count |

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
  cd ~/repositories/client-domain.dk
  git fetch origin
  git reset --hard origin/main
  cp -Rf dist/* ~/client-domain.dk/
  cd api && npm install --production
  pkill -f 'lsnode:.*client-domain' || true
  mkdir -p tmp && touch tmp/restart.txt
```

The `pkill` line is **ESSENTIAL** — without it, LiteSpeed will keep running stale code.

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
- **Kill lsnode on deploy**: `pkill -f 'lsnode:.*lavprishjemmeside' || true` is required in every deploy.
- **DB_HOST must be 127.0.0.1**: Using `localhost` can cause Unix socket connection failures in LiteSpeed.
- **dotenv needs absolute path**: Use `path.join(__dirname, '.env')` or the `.env` won't be found when LiteSpeed starts the app.
- **SSH Node version**: Default is v10. Use the virtual env or `/opt/alt/alt-nodejs22/root/usr/bin/node`.
- **zsh quirk**: Use single quotes for values containing `!` in shell commands.
- **Debugging**: Check `~/repositories/<project>/api/stderr.log` for Node.js errors. Clear it before testing: `> stderr.log`.

---

## Completed Phases
- **Phase 1**: Project setup, CI/CD, Layout/Header/Footer, Homepage, SSL/HTTPS, GA4, Search Console, Sitemap
- **Phase 2**: Express API, MySQL database (5 tables), JWT auth, event tracking, deploy pipeline with lsnode restart

## Pending
- Remaining pages (Priser, Om os, Kontakt)
- Admin dashboard frontend (`admin.lavprishjemmeside.dk`)
- SEO content optimization
