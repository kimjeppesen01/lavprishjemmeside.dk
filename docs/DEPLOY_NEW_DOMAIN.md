# Deploy To A New Domain

> Reference-only: internal/operator runbook or task context. External sprint agents should use the root handoff pack as execution authority.


Condensed checklist for a new standalone client install.

## Server Setup

- add the domain in cPanel
- add the API subdomain
- create the MySQL database and user
- create the Node.js app pointing at the repo `api/` folder and `server.cjs`

## CMS Setup

Run:

```bash
npm run setup
```

Required assistant inputs:

- `AGENT_ENTERPRISE_URL` = Funnel URL for the Lavpris public ingress
- `AGENT_ENTERPRISE_PROVISION_TOKEN`

The installer should return:

- site admin configured
- schema applied
- draft assistant provisioned
- site binding written into `api/.env`

## Final Verification

- `https://<domain>/admin/`
- `https://api.<domain>/health`
- `https://<domain>/admin/assistant/`

If `/admin/assistant/` cannot load assistant state, verify the `AGENT_ENTERPRISE_*` values in `api/.env`.

