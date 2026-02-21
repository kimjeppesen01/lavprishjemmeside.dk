# Deploy Healthcheck Runbook

Purpose: define deterministic machine gates for deploy health and provide recovery steps only when automation fails.

## 0. Autonomous policy (standard)

- Release gate is CI-only. No human signoff required.
- A deploy is successful only if all automated checks pass in `.github/workflows/deploy.yml`.
- If checks fail, workflow rolls back automatically to previous deployed commit and exits failed.
- Human action is fallback only (infrastructure outage, DNS failures, or broken server tooling).

## 1. Green/Red Criteria

- Green:
  - `https://api.lavprishjemmeside.dk/health` returns HTTP `200`
  - `/auth/login` responds (typically `200` for valid credentials or `401` for invalid credentials)
  - Admin login page loads and can submit without `Load failed`
- Red:
  - `/health` is non-200, timeout, DNS error, or TLS error
  - `/auth/login` unreachable / network error
  - Frontend deploy finished but API still serves old/broken behavior

## 2. Fast Validation (optional observer checks)

Run these from your terminal:

```bash
curl -i https://api.lavprishjemmeside.dk/health
curl -i -H "Content-Type: application/json" \
  -d '{"email":"invalid@example.com","password":"wrong"}' \
  https://api.lavprishjemmeside.dk/auth/login
```

Expected:
- Health returns `200 OK` with JSON.
- Login returns JSON and **not** a transport error (HTTP `401` is acceptable for invalid credentials).

## 3. Server-Side Verification (fallback only)

```bash
ssh -p 33 theartis@cp10.nordicway.dk
cd ~/repositories/lavprishjemmeside.dk
git fetch origin
git rev-parse --short HEAD
git rev-parse --short origin/main
```

If hashes differ:

```bash
git reset --hard origin/main
```

Check API env exists and key vars:

```bash
cd api
ls -la .env
grep -E "^(DB_HOST|DB_NAME|DB_USER|JWT_SECRET|CORS_ORIGIN|MASTER_STEP_UP_REQUIRED|MASTER_STEP_UP_TTL_MIN)=" .env
```

## 4. Restart API Safely (fallback only)

From `~/repositories/lavprishjemmeside.dk/api`:

```bash
mkdir -p tmp && touch tmp/restart.txt
```

Then re-check:

```bash
curl -i https://api.lavprishjemmeside.dk/health
```

If still unhealthy, manual force restart (SSH only):

```bash
pkill -f 'lsnode:.*lavprishjemmeside.dk' || true
```

## 5. Dependency/Runtime Recovery (fallback only)

From `~/repositories/lavprishjemmeside.dk/api`:

```bash
npm ci --omit=dev || npm install --production
mkdir -p tmp && touch tmp/restart.txt
```

Check for runtime syntax issues:

```bash
node --check server.cjs
node --check src/routes/master.js
node --check src/routes/auth.js
node --check src/routes/traffic.js
```

## 6. Common Failure Modes

- `Load failed` on admin login:
  - API unreachable, CORS mismatch, wrong API URL, or TLS/DNS issue.
- API returns `503` after deploy:
  - inspect `~/repositories/<domain>/api/stderr.log` immediately,
  - common root cause: runtime syntax error in API JS files that frontend build does not catch.
- Health returns `500`:
  - DB credentials invalid, DB unavailable, missing env variables.
- Deploy looked green but behavior is old:
  - stale `lsnode` process; restart with `tmp/restart.txt` (or manual `pkill` via SSH).
- Rate limiter startup validation issues:
  - ensure `api/src/middleware/rateLimit.js` uses `ipKeyGenerator` fallback for IP-based keys.

## 7. GitHub Actions Gates (authoritative)

Deploy must include and pass:

- `npm ci --omit=dev || npm install --production`
- build with `STRICT_CONTENT_FETCH=1` so content-fetch failures fail the build (no fallback deploy)
- `mkdir -p tmp && touch tmp/restart.txt`
- API `/health` = HTTP 200
- API `/design-settings/public` = HTTP 200
- API `/page-components/public?page=all` = HTTP 200
- API `/auth/login` invalid payload returns non-5xx
- Site root (`HEAD /`) returns non-5xx
- Automatic rollback to previous commit if any gate fails

## 9. Real Incident Reference (2026-02-20, ljdesignstudio.dk)

- Deploy run: `22245722242` (GitHub Actions) went green.
- Post-migration API returned `503`.
- Root cause in `stderr.log`: `SyntaxError: Unexpected end of input` in `api/src/services/anthropic.js`.
- Resolution:
  1. fix syntax in `api/src/services/anthropic.js`,
  2. push hotfix,
  3. deploy run `22245840248` (green),
  4. re-check all gates (`health`, `design-settings/public`, `page-components/public`, `auth/login`, site `HEAD /`).

## 8. Multi-Domain Notes

If deploying another client domain, set repository variables:

- `DEPLOY_REPO_PATH`
- `DEPLOY_SITE_ROOT`
- `DEPLOY_API_HEALTH_URL` (must match that client’s API domain)

Then rerun the same checks above against that client API URL.
