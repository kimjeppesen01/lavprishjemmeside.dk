# Lavpris CMS — Complete rollout manual

Step-by-step instructions to roll out the project: either the main site, a new client domain (GitHub + cPanel), or a ZIP handoff with 1-click setup. Use the section that matches your case.

---

## Start here — which doc to follow

**Implementing the CMS on a new domain?** Follow **only this file** (ROLLOUT_MANUAL.md):

| Your situation | Follow |
|---------------|--------|
| **New domain with ZIP** | **Part A** — On the **server**: upload ZIP to `~/[domain]` (cPanel File Manager), unzip there, then in a **server terminal** run `npm run setup` (output `./deploy-output`). Then in cPanel: **create API subdomain api.[domain]** (A.2), **Node.js app** for the API (A.3), **document root** `~/[domain]/deploy-output` (A.4), verify (A.5). |
| **New domain with GitHub deploy** | **Part B** — Create repo from template (B.1), add domain + DB (B.2–B.3), clone via cPanel Git to `repositories/[domain]` (B.3b), then SSH + .env + schema (B.4–B.5), Node.js App + GitHub Secrets/Vars + document root + first deploy (B.6–B.9). |
| **Redeploy main site (lavprishjemmeside.dk)** | **Part C** — Build, push, verify (C.1–C.3). |

Do **not** use DEPLOY_NEW_DOMAIN.md, MULTI_DOMAIN_CMS_PLAN.md, or other .md files for the rollout steps — they are reference or strategy. Use **UPSTREAM_UPDATES.md** only after the site is live, when you want to pull CMS updates from upstream.

**Reference:** [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) · [DEPLOY_NEW_DOMAIN.md](docs/DEPLOY_NEW_DOMAIN.md) · [README_INSTALL.md](README_INSTALL.md) · [MULTI_DOMAIN_CMS_PLAN.md](docs/MULTI_DOMAIN_CMS_PLAN.md)

---

## Who does what (Human vs AI / Terminal)

| Label | Meaning |
|-------|--------|
| **Human** | You do it: browser (GitHub, cPanel, login), clicking, typing in prompts, or pasting into GitHub/cPanel. An AI cannot do these. |
| **AI / Terminal** | Runs in a terminal (local or SSH). An AI assistant can run these commands for you; you only need to provide values (e.g. domain, DB name) when asked. |

**Which terminal?** **Server terminal** = on the hosting server (SSH or cPanel → Terminal); paths like `~/client.dk` are on the server. **Local terminal** = your computer (e.g. for Part C: `git pull`, `npm run build`, `git push`). Part A and Part B terminal steps use the **server**; Part C uses the **local** terminal.

Every step below is marked **Human** or **AI / Terminal** and states **Server** or **Local** when it matters. If a step has both (e.g. “get host from cPanel” then “run ssh”), the line says **Human** then **AI / Terminal**.

---

## Prerequisites (before you start)

- [ ] **GitHub** account with access to the template repo `kimjeppesen01/lavprishjemmeside.dk`.
- [ ] **cPanel** login for the server where the site will run.
- [ ] **SSH** access to the same server (for clone, run setup, or manual deploy).
- [ ] **Node.js 18+** on the machine that runs `npm run setup` or `npm run build` (local or server). On the cPanel server use `/opt/alt/alt-nodejs22/root/usr/bin/node`.
- [ ] **MySQL** database and user created in cPanel (for new domains). **Must be done in cPanel browser** — `uapi` does not work over SSH.
- [ ] **All source files committed** to the upstream repo before rolling out a new domain. Run `git status` locally; untracked files (e.g. new API routes) will cause 503 errors on the new domain. Commit and push them first.

---

## Repository and server paths

**What the repo is**

- One repo per domain. Create it **from the template only**: GitHub → open `kimjeppesen01/lavprishjemmeside.dk` → **Use this template** → **Create a new repository** → name repo after the domain (e.g. `client.dk`). Branch: **`main`**. Each domain has exactly one GitHub repo and one copy on the server at `~/repositories/[domain]`.

**Server path convention (fixed)**

On this server the cPanel user is **theartis**. The site folder is always **`/home/theartis/[domain]`**.

- **Site document root:** always `/home/theartis/[domain]/` (e.g. `~/client.dk/`). For ZIP flow use the subfolder where `dist/` is written: `~/[domain]/deploy-output`.
- **Repo on server (GitHub flow):** `/home/theartis/repositories/[domain]` (e.g. `~/repositories/client.dk`). GitHub vars: `DEPLOY_SITE_ROOT=[domain]`, `DEPLOY_REPO_PATH=repositories/[domain]`.

**Custom components folder:** The project includes `src/components/custom/` (empty except README at setup). Do not remove it; it is used for client-specific components and is never overwritten by seed or deploy. The extracted ZIP or clone contains this folder — keep it.

---

# Part A — Rollout using 1-click setup (ZIP)

**All of Part A is on the server.** You do **not** create the domain folder locally. The folder **`~/[domain]`** (e.g. `~/client.dk`) is **on the hosting server** (cPanel). Upload the ZIP there, unzip there, and run `npm run setup` in a **server terminal** (SSH or cPanel → Terminal).

Single path:
1. **Human:** In cPanel add the domain; create the **API subdomain api.[domain]** (see A.2) before the Node.js app. Set document root for the main site to **`~/[domain]/deploy-output`**. Upload `lavpris-cms-v1.1.zip` into **`~/[domain]`** (cPanel **File Manager** → navigate to the domain folder → Upload). Unzip there (File Manager “Extract”) or leave unzip to AI. The project includes **`src/components/custom/`** (empty except README). Do not remove it; it is used for client-specific components and is never overwritten by seed or deploy.
2. **AI / Terminal (server only):** Open a **server terminal** (SSH or cPanel → **Terminal**). You start in home (`~`). Run: **`cd ~/client.dk`** (or your domain folder), then **`cd lavpris-cms`** (or the folder that contains `package.json`). Verify with **`ls package.json`**. Only then run **`npm run setup`** with output path **`./deploy-output`**. Then do **A.2** (create API subdomain), then A.3–A.5.

---

## A.1 — On the server: extract and run setup

**Who:** **AI / Terminal** for Steps 1–2 (all commands). **Human** for Step 3 (answer prompts in the terminal).

**Terminal:** **Server only** — use SSH (see B.4) or cPanel → **Terminal**. Do not run these commands in a local folder on your computer.

**Critical:** After SSH you are in your **home directory** (`~` = `/home/theartis`). Your prompt looks like `[theartis@cp10 ~]$`. There is **no** `package.json` in home — if you run `npm run setup` from here you will get “ENOENT … package.json”. You **must** `cd` into the **project root** (the folder that contains `package.json`) before running `npm run setup`. **Also:** `package.json` is usually **not** directly in your domain folder (e.g. `~/ljdesignstudio.dk`); the ZIP extracts into a **subfolder** like `lavpris-cms`. So after `cd ~/yourdomain.dk` run `ls` and then `cd lavpris-cms` before `npm run setup`.

---

**Step 1 — Go to the project root (the folder that contains `package.json`)**

Replace `client.dk` with your domain folder name if different.

If the ZIP is **not** yet on the server: upload it via cPanel File Manager to `~/client.dk/`, then in the server terminal run:

```bash
cd ~/client.dk
unzip lavpris-cms-v1.1.zip
cd lavpris-cms
```

If the ZIP is **already** uploaded and unzipped (e.g. by you in File Manager):

```bash
cd ~/client.dk
ls
```

You should see a folder like **`lavpris-cms`** (the ZIP extracts into this subfolder; `package.json` is **not** directly in `~/client.dk`). Enter it:

```bash
cd lavpris-cms
```

(Replace `client.dk` with your domain folder, e.g. `cd ~/ljdesignstudio.dk` then `ls` then `cd lavpris-cms`.) If you get **“cd: lavpris-cms: No such file or directory”**, run **`ls`** — if you see the ZIP file only, run **`unzip lavpris-cms-v1.1.zip`** first, then `ls` again and `cd` into the folder that appeared. If you see a different folder name (e.g. `lavpris-cms-1.1`), `cd` into that and run **`ls package.json`** then **`npm run setup`**.

**Verify you are in the project root** (must succeed before running setup):

```bash
ls package.json
```

If you see `package.json`, you are in the right place. If you see “No such file or directory”, run `ls` and `cd` into the folder that contains `package.json` (often `lavpris-cms` or the name of the ZIP without `.zip`).

---

**Step 2 — Run the installer (only from the project root)**

```bash
npm run setup
```

**Step 3 — Answer the prompts (Human)**  
Type or paste the values when the script asks. Use the table as a guide:

| Prompt | What to type (example) |
|--------|------------------------|
| Site domain (e.g. client.dk) | `client.dk` |
| API subdomain [api.client.dk] | Press **Enter** (or type e.g. `api.client.dk`) |
| DB host [127.0.0.1] | `127.0.0.1` |
| DB name | The MySQL database name (e.g. `cpaneluser_cms`) |
| DB user | The MySQL user name |
| DB password | The MySQL password |
| Admin email | e.g. `admin@client.dk` |
| Admin password | Choose a strong password and type it |
| Output path for dist [./deploy-output] | **`./deploy-output`** (document root is then `~/client.dk/deploy-output`). |

**Expected:** Script writes `api/.env`, runs schema and seed, starts API, runs build, copies `dist/` to the output path, then prints “Setup complete”. Do **A.2** (create API subdomain), then A.3–A.5 next.

**If it fails:** Check that MySQL is reachable (`127.0.0.1`), DB name/user/password are correct, and Node is 18+.

---

## A.2 — cPanel: Create API subdomain (api.[domain])

**Who:** **Human** (browser: cPanel). Do this **before** creating the Node.js app (A.3); the Node.js app will use this subdomain as its Application URL.

**Where:** cPanel → **Domains** → **Subdomains**.

1. Log in to **cPanel**.
2. Go to **Domains** → **Subdomains**.
3. **Subdomain:** type **`api`** (the full hostname will be **`api.[yourdomain]`**, e.g. `api.client.dk` or `api.ljdesignstudio.dk`).
4. **Domain:** select your addon domain (e.g. `client.dk`).
5. **Document root:** leave default or set to a folder under the domain; the API is served by the Node.js app, not by files in this folder. Click **Create**.

The subdomain **api.[domain]** must exist before you create the Node.js application in A.3.

---

## A.3 — cPanel: Node.js app for the API

**Who:** **Human** (browser: cPanel only).

**Where:** cPanel in the browser.

1. Log in to **cPanel**.
2. Open **Setup Node.js App** (search for “Node” if needed).
3. Click **Create Application**.
4. Fill in:
   - **Node.js version:** 18 or 20.
   - **Application root:** For Part A (ZIP), **`~/client.dk/lavpris-cms/api`** (or `~/client.dk/api` if you unzipped so that `api/` is directly inside `~/client.dk`). Use your domain folder (e.g. `~/ljdesignstudio.dk/lavpris-cms/api`). Must contain `server.cjs`.
   - **Application URL:** The API subdomain you created in A.2, e.g. **`api.client.dk`** or **`api.ljdesignstudio.dk`**.
   - **Application startup file:** `server.cjs`.
5. Click **Create**.
6. Start the app if it is not running. Optionally click **Run NPM Install** in the UI to refresh dependencies.

**Important:** Do **not** put DB or secrets in cPanel “Environment variables”. They stay in `api/.env`.

---

## A.4 — Point the site domain to the built files

**Who:** **Human** (browser: cPanel → Domains). Set document root for the **main site** (not the API).

**Where:** cPanel → Domains.

1. Go to **Domains** (or **Addon Domains**).
2. Find the domain (e.g. `client.dk`) and open **Manage** / **Document root**.
3. Set the document root to **`~/client.dk/deploy-output`** (full path: `/home/theartis/client.dk/deploy-output`). Use your domain folder (e.g. `~/ljdesignstudio.dk/deploy-output`). Save.

---

## A.5 — First login and verify

**Who:** **Human** (browser: open URL, log in, check pages).

1. Open **https://&lt;your-domain&gt;/admin/** in a browser (e.g. `https://client.dk/admin/`).
2. Log in with the **admin email** and **admin password** you entered in A.1. If the API subdomain (A.2) or Node.js app (A.3) was skipped, the site may load but the admin will fail; complete A.2 and A.3 first.
3. Check:
   - **Design & styling** loads.
   - **Sider (Pages)** loads.
   - If something fails, see [DEPLOY_NEW_DOMAIN.md – Troubleshooting](docs/DEPLOY_NEW_DOMAIN.md#troubleshooting).

---

# Part B — Rollout of a new client domain (GitHub + cPanel)

Single path: create repo **from template** (B.1), add domain + DB in cPanel (B.2–B.3), **clone via cPanel Git** to `repositories/[domain]` (B.3b), then **AI / Terminal** does SSH, `api/.env`, schema, set-admin (B.4–B.5), then Human: Node.js App, GitHub Secrets/Vars, document root, first deploy (B.6–B.9).

---

## B.1 — Create the repo from template

**Who:** **Human** (browser: GitHub only).

**Where:** GitHub in the browser.

1. Open **https://github.com/kimjeppesen01/lavprishjemmeside.dk**.
2. Click **Use this template** → **Create a new repository**.
3. **Repository name:** the domain (e.g. `client.dk`).
4. **Owner:** your or your client’s organisation. **Public** or **Private** as needed.
5. Leave “Include all branches” unchecked. Click **Create repository**.

---

## B.2 — cPanel: add domain and subdomain

**Who:** **Human** (browser: cPanel → Domains / Subdomains).

**Where:** cPanel.

1. **Domains** → **Addon Domains** (or Subdomains if the main domain is the same account).
2. **New Domain Name:** e.g. `client.dk`.
3. **Subdomain / Document root:** Note the path (e.g. `client.dk` → document root `~/client.dk/`). Click **Add Domain**.
4. **Domains** → **Subdomains**.
5. **Subdomain:** `api` (so full name is `api.client.dk`).
6. **Document root:** Can match the addon or a subfolder; the API will run from the repo’s `api/` via Node.js App. Click **Create**.

---

## B.3 — cPanel: MySQL database and user

**Who:** **Human** (browser: cPanel → MySQL® Databases).

**Where:** cPanel → MySQL® Databases.

1. **Create Database:** Name e.g. `cpaneluser_cms`. Click **Create Database**.
2. **Create User:** Username and strong password. Click **Create User**.
3. **Add User To Database:** Select the user and the database, click **Add**. Grant **ALL PRIVILEGES**. Click **Make Changes**.

**Write down:** DB name, user, password. Use **127.0.0.1** as host (not `localhost`) in `.env` later.

---

## B.3b — cPanel: clone repo via Git Version Control

**Who:** **Human** (browser: cPanel).

**Where:** cPanel → **Git Version Control** → **Create** (or **Clone**).

1. **Repository URL:** `https://github.com/YOUR_ORG/client.dk.git` (replace with the repo you created in B.1).
2. **Branch:** `main`.
3. **Clone to:** **`repositories/client.dk`** (path under home; no leading slash). Repo will be at `/home/theartis/repositories/client.dk`.
4. Click **Create** / **Clone**. Wait until the clone completes.

---

## B.4 — SSH into the server and create api/.env

**Who:** **Human** for “How to SSH in” (read host/port/username in cPanel). **AI / Terminal** for everything after you are on the server: `cd` to repo, create `api/.env`, generate `JWT_SECRET`.

**Terminal:** From your **local terminal** run `ssh -p PORT USER@HOST`; after login you are in a **server terminal**. All commands below (cd, nano, openssl) run in that server session.

**Where:** Your machine (Terminal or PowerShell) to connect; then all following commands run on the server.

**How to SSH in (Human: get values from cPanel):**

1. In **cPanel**, open **SSH Access** (or **Terminal**). There you see:
   - **Server hostname** (e.g. `cp10.nordicway.dk` or the server IP).
   - **Port** (often `22` or a custom port like `33`).
   - **Username** (your cPanel username).
2. From your machine, open a terminal and run (replace with your host, port, and username):

   **If you use password:**
   ```bash
   ssh -p PORT USERNAME@HOST
   ```
   Example: `ssh -p 33 theartis@cp10.nordicway.dk`. Enter your cPanel password when prompted.

   **If you use an SSH key:**
   ```bash
   ssh -i /path/to/your/private_key -p PORT USERNAME@HOST
   ```
   Example: `ssh -i ~/.ssh/id_ed25519 -p 33 theartis@cp10.nordicway.dk`.

3. You are now in a shell on the server. Your home directory is e.g. `~/` (same account as cPanel; the new domain uses this same server and user).

**AI / Terminal — run these commands (repo is already at `~/repositories/client.dk` from B.3b):**

If the repo was **not** cloned via cPanel Git (B.3b) and you need to clone it via SSH terminal, use a GitHub PAT embedded in the URL (the server has no interactive auth):

```bash
git clone https://YOUR_GITHUB_USER:YOUR_GITHUB_PAT@github.com/YOUR_ORG/client.dk.git ~/repositories/client.dk
```

Otherwise (cPanel Git already cloned it):

```bash
cd ~/repositories/client.dk
```

Create `api/.env` (replace placeholders with your domain and DB values). Paste (then replace values and save):

```env
DB_HOST=127.0.0.1
DB_USER=the_mysql_user
DB_PASSWORD=the_mysql_password
DB_NAME=the_mysql_database
JWT_SECRET=your_long_random_string_here
PORT=3000
CORS_ORIGIN=https://client.dk
PASSWORD_RESET_BASE_URL=https://client.dk
RESEND_API_KEY=
EMAIL_FROM_NAME=client.dk
EMAIL_FROM_ADDRESS=noreply@client.dk
GITHUB_PAT=ghp_xxxx
GITHUB_REPO=YOUR_ORG/client.dk
ANTHROPIC_API_KEY=
PEXELS_API_KEY=
```

Save (Ctrl+O, Enter, Ctrl+X in nano). Generate a secure `JWT_SECRET` (e.g. `openssl rand -hex 32`).

**Copy API keys from the main site** — `ANTHROPIC_API_KEY` (required for AI Assemble) and `PEXELS_API_KEY` are not domain-specific. Copy them from the main site's server `.env`:

```bash
# Run on server — copies keys without printing values to screen
MAIN_ENV=~/repositories/lavprishjemmeside.dk/api/.env
LJ_ENV=~/repositories/client.dk/api/.env
for KEY in ANTHROPIC_API_KEY PEXELS_API_KEY GITHUB_PAT; do
  VALUE=$(grep "^${KEY}=" "$MAIN_ENV" | head -1)
  [ -n "$VALUE" ] && sed -i "/^${KEY}=/d" "$LJ_ENV" && echo "$VALUE" >> "$LJ_ENV" && echo "Set $KEY"
done
# Fix GITHUB_REPO back to the new domain's repo
sed -i "s|^GITHUB_REPO=.*|GITHUB_REPO=YOUR_ORG/client.dk|" "$LJ_ENV"
touch ~/repositories/client.dk/api/tmp/restart.txt
```

Without `ANTHROPIC_API_KEY`, the AI Assemble feature will fail. Without `GITHUB_PAT` with `workflow` scope, the Publish button will fail.

---

## B.5 — Run schema and seed on the server

**Who:** **AI / Terminal** (all commands).

**Terminal:** **Server only** — same SSH (or cPanel Terminal) session as B.4. Repo root at `~/repositories/client.dk`.

**Schema:** One command runs all required schemas and seeds (no manual SQL). Full order: [docs/SCHEMA_OVERVIEW.md](docs/SCHEMA_OVERVIEW.md).

**Important — Node.js version:** The default `node` on the server PATH may be very old (v10). Always prefix with the Node 22 path or the schema and npm install will fail:

```bash
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
cd ~/repositories/client.dk
npm ci
cd api && npm ci --omit=dev && cd ..
node api/run-schema.cjs
ADMIN_EMAIL=admin@client.dk ADMIN_PASSWORD=YourChosenPassword node api/set-admin.cjs
```

(Replace `admin@client.dk` and `YourChosenPassword` with the admin email and password for this site. The schema runner is idempotent — safe to re-run. If it fails, check that `api/.env` exists with correct DB credentials and that Node 22 is on PATH.)

**Note:** `set-admin.cjs` prints nothing on success (no output = OK). Verify with: `mysql -u DB_USER -p'DB_PASS' -h 127.0.0.1 DB_NAME -e "SELECT email, role FROM users;"`

---

## B.6 — cPanel: Node.js app for the API

**Who:** **Human** (browser: cPanel → Setup Node.js App). The **api.[domain] subdomain** must already exist (you created it in B.2). Same as **A.3** (Node.js app), but:

- **Application root:** **`~/repositories/client.dk/api`** (use your domain in the path, e.g. `~/repositories/mydomain.dk/api`).
- **Application URL:** **`api.client.dk`** (use your API subdomain, e.g. `api.mydomain.dk`).

---

## B.7 — GitHub: Secrets and Variables

**Who:** **Human** (browser: GitHub → Settings → Secrets and variables → Actions; add each secret/variable).

**Where:** GitHub → repo → **Settings** → **Secrets and variables** → **Actions**.

**Secrets** (Add “New repository secret” for each):

| Name | Value |
|------|--------|
| `FTP_SERVER` | cPanel server hostname (e.g. `cp10.nordicway.dk` or the server IP). |
| `FTP_USERNAME` | cPanel username. |
| `SSH_PRIVATE_KEY` | Full contents of the **private** SSH key (e.g. ed25519) used to log in to the server. No passphrase for CI. |
| `SSH_PORT` | SSH port (e.g. `22` or `33`). |

**Variables** (Add “New repository variable” for each):

| Name | Value |
|------|--------|
| `PUBLIC_SITE_URL` | `https://client.dk` |
| `PUBLIC_API_URL` | `https://api.client.dk` |
| `DEPLOY_REPO_PATH` | `repositories/client.dk` (path under home on the server). |
| `DEPLOY_SITE_ROOT` | `client.dk` (folder under home where `dist/*` will be copied). |

---

## B.8 — Document root for the site

**Who:** **Human** (browser: cPanel → Domains).

**Where:** cPanel → Domains.

Set the **site domain** (e.g. `client.dk`) document root to **`~/client.dk/`** (full path: `/home/theartis/client.dk/`). This is where the workflow copies `dist/*` when `DEPLOY_SITE_ROOT=client.dk`.

---

## B.9 — First deploy

**Who:** **Human** (browser: GitHub Actions → Run workflow; then open site and log in to verify).

**Where:** GitHub.

1. Open the repo → **Actions** → workflow **Build & Deploy**.
2. Click **Run workflow** → **Run workflow** (branch `main`).
3. Wait until the job is green.
4. Open **https://client.dk** and **https://client.dk/admin/**.
5. Log in with the admin email/password you set in B.5.
6. Verify CMS version: run `git describe --tags` — should show e.g. `v1.0.0`.

For future updates to this site, follow **`docs/UPSTREAM_UPDATES.md`**.

---

# Part C — Rollout of the main site (lavprishjemmeside.dk)

Use this when you are deploying or redeploying the **existing** main project (no new domain, no template).

## C.1 — Local: build and verify before push

**Who:** **AI / Terminal** (all commands).

**Terminal:** **Local only** — your computer (e.g. VS Code terminal, Terminal.app). Repo root = your local clone of lavprishjemmeside.dk.

**Where:** Your machine, repo root.

```bash
cd /path/to/lavprishjemmeside.dk
git pull --rebase origin main
npm ci
npm run build
npm run verify
```

**Expected:** Build succeeds; `verify` reports OK for `/health`, `/design-settings/public`, `/page-components/public`. Fix any failures before pushing.

---

## C.2 — Deploy via GitHub Actions

**Who:** **AI / Terminal** for `git add` / `commit` / `push`. **Human** for (optional) adding `GITHUB_PAT` to `api/.env` on the server if you use the “Publicer” button.

1. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```
2. GitHub Actions will run **Build & Deploy**: build, commit `dist/`, SSH to server, copy `dist/*` to the site root, reinstall API deps, touch `tmp/restart.txt`.
3. Wait for the workflow to finish (~1–2 min). Check **Actions** tab for success.

**Optional — Trigger deploy from admin “Publicer” button:**  
Add `GITHUB_PAT` (and if needed `GITHUB_REPO`) to `api/.env` on the server. Then “Publicer side” in the admin triggers the same workflow.

---

## C.3 — Verify live site

**Who:** **AI / Terminal** for the `npm run verify` command. **Human** for opening the site and admin in the browser and logging in.

```bash
PUBLIC_API_URL=https://api.lavprishjemmeside.dk PUBLIC_SITE_URL=https://lavprishjemmeside.dk npm run verify
```

Open the site and admin in the browser; log in and check one page and the dashboard.

---

# Part D — Get env template for a new domain (optional)

**Who:** **AI / Terminal** runs the script. **Human** copies the printed `api/.env` block into `api/.env` and the Variables into GitHub **Settings → Secrets and variables → Actions → Variables**.

Run this when you want suggested `api/.env` and GitHub Variables text to paste (instead of writing from scratch).

```bash
cd /path/to/repo/root
node scripts/setup-domain.mjs
```

Answer the prompts; copy the printed `api/.env` block into `api/.env` and the Variables into the repo’s **Settings → Secrets and variables → Actions → Variables**.

---

# Quick reference — exact prompts (1-click setup)

**Who:** **Human** (you type these when the setup script prompts you). The script itself is **AI / Terminal**.

When you run `npm run setup`, type exactly (replace with real data):

```
Site domain (e.g. client.dk): client.dk
API subdomain [api.client.dk]: <Enter>
DB host [127.0.0.1]: 127.0.0.1
DB name: cpaneluser_cms
DB user: cpaneluser_dbuser
DB password: ********
Admin email: admin@client.dk
Admin password: ********
Output path for dist [./deploy-output]: ./deploy-output
```

---

# Troubleshooting

**Who:** **Human** (you read and decide). Fixes may involve **Human** (cPanel, GitHub Settings, editing `.env`) or **AI / Terminal** (running schema, `openssl rand`, etc.) as indicated in the table or linked docs.

| Symptom | What to do |
|--------|------------|
| `ENOENT … package.json` or “no such file or directory, open … package.json” | You ran `npm run setup` from the wrong directory (e.g. home `~`). Run `cd ~/yourdomain.dk`, `ls` — if you see a folder (e.g. `lavpris-cms`), `cd` into it; if you only see the ZIP, run `unzip lavpris-cms-v1.1.zip` first, then `cd` into the new folder. Then `ls package.json` and `npm run setup`. |
| `cd: lavpris-cms: No such file or directory` | The folder doesn’t exist yet. Run `ls` in your domain folder — if you see the ZIP, run `unzip lavpris-cms-v1.1.zip`; if empty, upload the ZIP via cPanel File Manager and unzip there. Then `ls` and `cd` into the folder that appears. |
| `npm ci` fails with “Cannot read property …” | The default `node` on the server is v10. Run `export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH` first, then retry. |
| `Cannot find module ‘./src/routes/traffic’` (or any route) | A new route file was added to `server.cjs` but not committed to the repo. On your local machine: `git add api/src/routes/traffic.js && git commit && git push`. Then on the server: `git fetch origin && git reset --hard origin/main`. |
| API returns 503 Service Unavailable | Node.js app is not running or crashed on startup. In cPanel → Setup Node.js App, check the app is Started. Then test manually via SSH: `export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH && cd ~/repositories/[domain]/api && node server.cjs` — the error will be printed to stderr. |
| API subdomain not resolving (curl: Could not resolve host) | The `api.[domain]` subdomain was not created in cPanel. Go to cPanel → Domains → Subdomains, create `api` under the domain. Creating the subdomain also adds the DNS A record automatically. |
| Login form submits as GET (credentials appear in the URL) | The admin JS event listener is not registering. Most likely the API subdomain doesn’t exist yet (so fetch fails silently and the browser falls back to native form submit). Create the subdomain and Node.js app first. If the subdomain is fine, check for JS errors in the browser console. |
| “Kunne ikke opdatere design indstillinger” (500 on design settings save) | Feature toggle columns are missing from the DB. Run: `mysql -u DB_USER -p'DB_PASS' -h 127.0.0.1 DB_NAME -e “ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS feature_smooth_scroll TINYINT(1) NOT NULL DEFAULT 1; ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS feature_grain_overlay TINYINT(1) NOT NULL DEFAULT 1; ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS feature_page_loader TINYINT(1) NOT NULL DEFAULT 1; ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS feature_sticky_header TINYINT(1) NOT NULL DEFAULT 1; ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS page_loader_text VARCHAR(100) NOT NULL DEFAULT 'Indlæser...'; ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS page_loader_show_logo TINYINT(1) NOT NULL DEFAULT 1; ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS page_loader_duration DECIMAL(3,1) NOT NULL DEFAULT 2.5;”` — This is fixed in `run-schema.cjs` (schema_design_features.sql now included), so it only affects installs from before this fix. |
| api.[domain] resolves on server (`dig @server`) but browser shows “can't find server” | DNS has propagated globally but your ISP's resolver hasn't caught up yet. Fastest fix: switch your Mac/PC DNS to Google (`8.8.8.8`, `8.8.4.4`) in Network Settings. Alternatively add a temporary `/etc/hosts` entry: `echo “SERVER_IP api.client.dk” \| sudo tee -a /etc/hosts`. ISP resolvers typically catch up within a few hours. |
| “Too many login attempts, please try again in 15 minutes” | The in-memory rate limiter (5 attempts / 15 min) was triggered. Either wait 15 minutes, or restart the Node app to reset it: `touch ~/repositories/client.dk/api/tmp/restart.txt`. |
| Admin actions fail after password change (401 / token errors) | The browser has a stale JWT token from before the password change. Open DevTools → Application → Local Storage → `https://client.dk` → delete `admin_token`. Log in fresh with the new credentials. |
| AI Assemble fails or returns error | `ANTHROPIC_API_KEY` is missing from `api/.env`. Copy it from the main site's `.env` on the server (see B.4 above) and restart the app. |
| API 500 or “database disconnected” | Check `api/.env` exists, `DB_HOST=127.0.0.1`, DB name/user/password correct; schema and seed run. |
| CORS error in browser | `CORS_ORIGIN` in `api/.env` must match the site URL exactly (e.g. `https://client.dk`). |
| Build uses wrong domain | Set GitHub Variables `PUBLIC_SITE_URL` and `PUBLIC_API_URL` for that repo. |
| Deploy copies to wrong folder | Check GitHub Variables `DEPLOY_REPO_PATH` and `DEPLOY_SITE_ROOT` match server paths under `~`. |
| Node app won’t start | Application root = folder containing `server.cjs`; startup file = `server.cjs`; `.env` in that folder. SSH in and run `node server.cjs` manually in that folder to see the error. |
| “Publicer” does nothing | Add `GITHUB_PAT` (and if needed `GITHUB_REPO`) to `api/.env` on the server. |
| `uapi` command fails with “setuids failed” over SSH | This is expected — cPanel’s `uapi` cannot run over a regular SSH session. Create MySQL databases and users through the cPanel browser interface instead. |

More: [DEPLOY_NEW_DOMAIN.md – Troubleshooting](docs/DEPLOY_NEW_DOMAIN.md#troubleshooting), [PROJECT_CONTEXT.md – cPanel gotchas](PROJECT_CONTEXT.md).

---

# Doc map

| Document | Use when |
|----------|----------|
| **This file (ROLLOUT_MANUAL.md)** | You need a single, step-by-step human manual for any rollout. |
| [README_INSTALL.md](README_INSTALL.md) | Quick install from ZIP or clone; `npm run setup`. |
| [DEPLOY_NEW_DOMAIN.md](docs/DEPLOY_NEW_DOMAIN.md) | Checklist for a new client domain (no ZIP). |
| [UPSTREAM_UPDATES.md](docs/UPSTREAM_UPDATES.md) | Client pulls upstream and redeploys. |
| [MULTI_DOMAIN_CMS_PLAN.md](docs/MULTI_DOMAIN_CMS_PLAN.md) | Multi-domain product vision, deployment model, ZIP installer. |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Tech stack, cPanel/CI gotchas, project structure. |
