# Lavpris CMS — Quick install

Extract the ZIP (or clone the repo), then run one command to install the CMS.

## Prerequisites

- **Node.js 18+**
- **MySQL** database and user (use `127.0.0.1` as host on cPanel, not `localhost`)
- (Optional) cPanel with SSH so you can run the installer on the server

## Install

```bash
npm run setup
```

You will be prompted for:

- Site domain (e.g. `app.client.dk`)
- API subdomain (default `api.app.client.dk`)
- DB host, name, user, password
- Admin email and password
- Output path for the built site (default `./deploy-output`)

The script will:

1. Create `api/.env` with your values
2. Install dependencies (root + api)
3. Run database schema and seed components
4. Set the admin user
5. Start the API temporarily, run a full build, then stop it
6. Copy `dist/` to your chosen output path

## After setup

1. **cPanel → Setup Node.js App**  
   - Application root: path to the `api` folder  
   - Startup file: `server.cjs`  
   - Application URL: your API subdomain (e.g. `api.app.client.dk`)

2. **Point the site domain** document root to the output folder (e.g. `deploy-output/` or `~/app.client.dk/`).

3. Open **https://yourdomain.dk/admin/** and log in with the admin email and password you set.

4. For **“Publicer”** (rebuild) from the admin: add GitHub repo, secrets, and workflow; or run builds manually with  
   `PUBLIC_SITE_URL=... PUBLIC_API_URL=... npm run build` then copy `dist/*` to the document root.

## Non-interactive (CI / scripted)

```bash
SETUP_INTERACTIVE=0 \
  PUBLIC_SITE_URL=https://app.client.dk \
  PUBLIC_API_URL=https://api.app.client.dk \
  DB_HOST=127.0.0.1 \
  DB_NAME=yourdb \
  DB_USER=youruser \
  DB_PASSWORD=yourpass \
  ADMIN_EMAIL=admin@app.client.dk \
  ADMIN_PASSWORD=yourpass \
  node scripts/setup.cjs
```

## More

- New domain checklist: [docs/DEPLOY_NEW_DOMAIN.md](docs/DEPLOY_NEW_DOMAIN.md)
- Upstream updates: [docs/UPSTREAM_UPDATES.md](docs/UPSTREAM_UPDATES.md)
- Full context: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
