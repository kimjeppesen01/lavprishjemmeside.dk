# Rollout Manual

> Reference-only: internal/operator runbook or task context. External sprint agents should use the root handoff pack as execution authority.


Use this manual for new installs and major rollouts.

## Prerequisites

- cPanel domain and API subdomain created
- MySQL database and user created
- Node.js app available on cPanel
- SSH access to the server
- Agent Enterprise public ingress reachable through its Funnel URL
- `AGENT_ENTERPRISE_PROVISION_TOKEN` available for setup

## New Install Flow

1. place the repo or ZIP on the server
2. run `npm run setup`
3. provide:
   - domain
   - database credentials
   - admin credentials
   - `AGENT_ENTERPRISE_URL`
   - `AGENT_ENTERPRISE_PROVISION_TOKEN`
4. let setup write `api/.env`, run schema, and provision the draft assistant
5. create or verify the cPanel Node.js app for `api/server.cjs`
6. build and sync the site
7. log in to `/admin/assistant/` and complete the wizard

## Existing Install Rollout

1. merge or sync the new code into `~/repositories/<domain>`
2. update `api/.env` if required
3. run `node api/run-schema.cjs`
4. run `npm run build`
5. sync `dist/` to the site root
6. touch `api/tmp/restart.txt`
7. verify `/health`, `/admin/dashboard/`, and `/admin/assistant/`

## Publish Button Rule

After a real SSH rollout is complete, the publish button is allowed for normal content/theme rebuilds only.

