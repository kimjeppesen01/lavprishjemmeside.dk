# Upstream Updates

> Reference-only: internal/operator runbook or task context. External sprint agents should use the root handoff pack as execution authority.


Use this guide when an existing client install needs new CMS code from upstream.

## Core Rule

- Content lives in MySQL and is not replaced by upstream updates.
- `api/.env` is local and must be preserved.
- Assistant site-binding values in `api/.env` are local and must be preserved.
- Deploy updated code over SSH after merging upstream; the publish button is not the code rollout mechanism.

## 1. Sync The Repo

```bash
git fetch upstream
git checkout main
git pull --rebase origin main
git merge upstream/main
```

If you track release tags instead of `upstream/main`, merge the target tag instead.

## 2. Review Local Config

Keep these local:

- `api/.env`
- any client-only assets or component files
- the installed site’s current `AGENT_ENTERPRISE_*` binding values
- the installed site’s `LAVPRIS_PARENT_API_URL` if it differs from the default parent API origin

Review whether upstream added new required env keys.

## 3. Apply Schema

From the repo root on the server:

```bash
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
node api/run-schema.cjs
```

The runner is additive and safe to re-run.

## 4. Deploy Over SSH

Use the SSH-first flow for code changes:

1. update the repo clone under `~/repositories/<domain>`
2. run `npm run build`
3. sync `dist/` into the document root
4. touch `api/tmp/restart.txt`
5. verify `/health`

The admin publish button can be used afterward for later content-only rebuilds.

## 5. Verify Assistant Access

If the install uses the assistant module, confirm:

- `AGENT_ENTERPRISE_URL` still points at the correct Funnel origin
- `AGENT_ENTERPRISE_SITE_KEY` is present
- `AGENT_ENTERPRISE_SITE_TOKEN` is present
- `AGENT_ENTERPRISE_CLIENT_AGENT_ID` is present
- `/admin/assistant/` still loads and can fetch assistant state

## 6. Verify Rollout Telemetry

After the upstream code is live, confirm:

- `/health` now exposes the `cms` release telemetry fields including `changelog_sha` and `last_deployed_at`
- `/rollout/status` responds for the local CMS install
- `npm run lavpris:release-health` reflects the new rollout state from Agent Enterprise

