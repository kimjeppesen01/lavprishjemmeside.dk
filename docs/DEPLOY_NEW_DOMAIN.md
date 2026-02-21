# Deploy CMS to a New Domain

Step-by-step checklist for deploying the lavprishjemmeside.dk CMS to a new client domain. Each site is **standalone**: own repo, own cPanel setup, own MySQL database.

**Prerequisites:** cPanel hosting with SSH, Node.js 18+ (e.g. via "Setup Node.js App"), MySQL. Phase 1 (env-based config) must be in place.

---

## 1. Get the code

- **Option A:** Use GitHub template: "Use this template" → create repo `owner/client-domain.dk` (or similar).
- **Option B:** Fork the upstream repo; rename or use as-is.

Clone locally or on the server as needed. The repo will be deployed to the server in step 5.

---

## 2. cPanel: Domain and document roots

| Step | Where | Action |
|------|--------|--------|
| 2.1 | Domains → Addon Domains | Add the site domain (e.g. `app.client.dk`). Note the document root (e.g. `~/app.client.dk/`). |
| 2.2 | Domains → Subdomains | Add API subdomain (e.g. `api.app.client.dk`). Point to same folder as the repo or a dedicated folder; the API will run from the repo’s `api/` directory via Node.js App. |

Use a **domain property** in Google Search Console later (e.g. `sc-domain:app.client.dk`).

---

## 3. cPanel: MySQL database

| Step | Where | Action |
|------|--------|--------|
| 3.1 | MySQL® Databases | Create a database (e.g. `cpaneluser_cmsdb`). |
| 3.2 | MySQL® Databases | Create a user; set a strong password. |
| 3.3 | MySQL® Databases | Add user to database with **ALL PRIVILEGES**. |

Note: **DB_HOST**: use `127.0.0.1` (not `localhost`) to avoid socket issues with Node.js on cPanel.

---

## 4. Server: Clone repo and paths

SSH into the server.

- Clone (or pull) the repo into a dedicated directory, e.g.  
  `~/repositories/app.client.dk`  
  so the structure is:  
  `~/repositories/app.client.dk/api/`, `~/repositories/app.client.dk/src/`, etc.

- Decide where the **static site** (Astro `dist/`) will be served from. Typical options:
  - **Same account, subfolder:** e.g. `~/app.client.dk/` as document root; deploy will copy `dist/*` there.
  - Then: **DEPLOY_SITE_ROOT** = `app.client.dk` (no leading path), **DEPLOY_REPO_PATH** = `repositories/app.client.dk` (see step 8).

---

## 5. Create `api/.env`

In the repo on the server, create `api/.env` (file is gitignored). Use `api/.env.example` as reference. Set at least:

```bash
# Database (use 127.0.0.1, not localhost)
DB_HOST=127.0.0.1
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# Server
PORT=3000
JWT_SECRET=generate_a_long_random_string

# Site URLs (this domain)
CORS_ORIGIN=https://app.client.dk
PASSWORD_RESET_BASE_URL=https://app.client.dk

# Email (Resend or your SMTP)
RESEND_API_KEY=re_xxxx
EMAIL_FROM_NAME=app.client.dk
EMAIL_FROM_ADDRESS=noreply@app.client.dk

# Publish (this repo’s GitHub)
GITHUB_PAT=ghp_xxxx
GITHUB_REPO=owner/app.client.dk

# Optional: AI, Pexels, Google (Traffic dashboard)
# ANTHROPIC_API_KEY=...
# GOOGLE_SITE_URL=sc-domain:app.client.dk
# GOOGLE_GA4_PROPERTY_ID=...
```

---

## 6. Run database schema and seed

From the repo root on the server (or from `api/` as needed), run the SQL files in order. Use phpMyAdmin (Import) or MySQL CLI.

**Order:**

1. `api/src/schema.sql`
2. `api/src/schema_password_reset.sql`
3. `api/src/schema_phase6.sql`
4. `api/src/schema_header_footer.sql`
5. `api/src/schema_media.sql`
6. `api/src/schema_page_meta.sql`
7. `api/src/schema_ai_prompt_settings.sql`
8. `api/src/schema_indexes.sql`
9. `api/src/seed_components_v2.sql`

Then set the admin user (from `schema.sql` the default may be `admin@lavprishjemmeside.dk`):

```sql
UPDATE users SET email = 'admin@app.client.dk', password_hash = '<bcrypt_hash>' WHERE role = 'admin' LIMIT 1;
```

Generate the bcrypt hash locally (Node: `require('bcrypt').hashSync('your_password', 10)`).

---

## 7. cPanel: Node.js application for the API

| Step | Where | Action |
|------|--------|--------|
| 7.1 | Setup Node.js App | Create application. |
| 7.2 | Application root | Set to the **api** directory of the repo (e.g. `~/repositories/app.client.dk/api` or the path that contains `server.cjs`). |
| 7.3 | Application URL | Set to the API subdomain (e.g. `api.app.client.dk`). |
| 7.4 | Node version | 18 or 20. |
| 7.5 | Application startup file | `server.cjs` (must be `.cjs`). |

Do **not** rely on cPanel’s “Environment variables” UI for `.env`; keep using the `api/.env` file. Ensure the app uses `path.join(__dirname, '.env')` for `dotenv` (see PROJECT_CONTEXT.md).

---

## 8. GitHub: Secrets and variables

In the **repository** (e.g. `owner/app.client.dk`):

**Secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `FTP_SERVER` | cPanel server hostname (e.g. `cp10.nordicway.dk`). |
| `FTP_USERNAME` | cPanel username. |
| `SSH_PRIVATE_KEY` | Private key for SSH (no passphrase recommended for CI). |
| `SSH_PORT` | SSH port (e.g. `33`). |

**Variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Example | Purpose |
|----------|---------|--------|
| `PUBLIC_SITE_URL` | `https://app.client.dk` | Build: sitemap, canonical, OG. |
| `PUBLIC_API_URL` | `https://api.app.client.dk` | Build: fetch design/pages. |
| `DEPLOY_REPO_PATH` | `repositories/app.client.dk` | SSH: path under `~` to repo. |
| `DEPLOY_SITE_ROOT` | `app.client.dk` | SSH: path under `~` where `dist/*` is copied. |

If variables are not set, the workflow uses defaults for lavprishjemmeside.dk.

---

## 9. Document root for the site

Point the **site domain** (e.g. `app.client.dk`) document root to the directory where the workflow copies `dist/`:

- The workflow runs: `cp -Rf dist/* ~/$SITE_ROOT/`.
- So the document root for `app.client.dk` should be: `~/app.client.dk/` (if `DEPLOY_SITE_ROOT=app.client.dk`).

Configure this in cPanel (Domains → the domain → Document root).

---

## 10. First build and deploy

- Push to `main` (or trigger **Actions → Build & Deploy → Run workflow**).
- After the job runs: site at `https://app.client.dk`, admin at `https://app.client.dk/admin/`, API at `https://api.app.client.dk`.
- Log in with the admin email/password you set in step 6.

---

## 11. Post-deploy

- **Admin:** Change password if needed; configure Design & styling, Header & Footer, Pages.
- **Publish:** “Publicer side” in admin triggers the same workflow (workflow_dispatch) to rebuild and redeploy.
- **Updates from upstream:** See [UPSTREAM_UPDATES.md](docs/UPSTREAM_UPDATES.md).

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| API 500 / DB errors | `api/.env` present and correct; `DB_HOST=127.0.0.1`; schema + seed run. |
| CORS errors | `CORS_ORIGIN` in `api/.env` matches the site URL exactly (e.g. `https://app.client.dk`). |
| Build uses wrong URL | GitHub vars `PUBLIC_SITE_URL` and `PUBLIC_API_URL` set for this repo. |
| Deploy copies to wrong place | `DEPLOY_SITE_ROOT` and `DEPLOY_REPO_PATH` match server paths under `~`. |
| Node app not starting | Startup file is `server.cjs`; app root is the `api` folder; `.env` in `api/`. |

See also **PROJECT_CONTEXT.md** (cPanel/LiteSpeed/Node.js gotchas, restart via `tmp/restart.txt`, no `pkill` in CI).
