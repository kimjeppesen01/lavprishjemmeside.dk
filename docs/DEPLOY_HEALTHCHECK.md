# Deploy Healthcheck

> Reference-only: internal/operator runbook or task context. External sprint agents should use the root handoff pack as execution authority.


Use these checks after any SSH rollout.

## Green Criteria

- `https://api.<domain>/health` returns `200`
- admin login works
- live site responds
- `/admin/assistant/` can load when the site uses the assistant module

## Fast Checks

```bash
curl -i https://api.<domain>/health
curl -I https://<domain>/
```

## Assistant Checks

- `AGENT_ENTERPRISE_URL` still points to the Funnel origin
- assistant status loads through the CMS proxy
- site token has not been lost from `api/.env`

## Recovery

From the repo root on the server:

```bash
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
node api/run-schema.cjs
cloudlinux-selector restart --json --interpreter nodejs --app-root /home/theartis/repositories/<domain>/api
```

If the CloudLinux restart does not refresh the worker pool, `touch api/tmp/restart.txt` is a legacy fallback only, not the primary restart contract.

If the issue is assistant reachability, verify the Funnel health endpoint and the Agent Enterprise public ingress before changing CMS code.

