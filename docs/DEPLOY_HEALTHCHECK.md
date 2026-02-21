# Deploy Healthcheck Runbook

Purpose: verify every deploy is actually live and healthy, and give deterministic recovery steps when it is not.

## 1. Green/Red Criteria

- Green:
  - `https://api.lavprishjemmeside.dk/health` returns HTTP `200`
  - `/auth/login` responds (typically `200` for valid credentials or `401` for invalid credentials)
  - Admin login page loads and can submit without `Load failed`
- Red:
  - `/health` is non-200, timeout, DNS error, or TLS error
  - `/auth/login` unreachable / network error
  - Frontend deploy finished but API still serves old/broken behavior

## 2. Fast Validation (after deploy)

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

## 3. Server-Side Verification (SSH)

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

## 4. Restart API Safely (LiteSpeed)

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

## 5. Dependency/Runtime Recovery

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

## 7. GitHub Actions Checks

In Actions log, verify deploy step contains:

- `npm ci --omit=dev || npm install --production`
- build with `STRICT_CONTENT_FETCH=1` so content-fetch failures fail the build (no fallback deploy)
- `mkdir -p tmp && touch tmp/restart.txt`
- API health retry loop that fails the workflow if `/health` never returns `200`.

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
