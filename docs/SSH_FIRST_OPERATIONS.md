# SSH-First Operations

> Reference-only: internal/operator runbook or task context. External sprint agents should use the root handoff pack as execution authority.


This repository is operated in SSH-first mode.

## Deploy Authority

- GitHub Actions deploy is retired for this repo.
- Production code, schema, and env changes are released over SSH.
- GitHub remains the shared sync surface between Bolt.new and cPanel.
- Agent Enterprise owns the assistant runtime; shared cPanel reaches it through the Funnel-backed Lavpris public ingress.

## Publish Endpoint Scope

`POST /publish` and the admin publish button perform a local rebuild-and-sync flow from the code already present on the server:

1. run `npm run build`
2. sync `dist/` into the live site root
3. touch `api/tmp/restart.txt`
4. record publish audit state

Use it only for:

- content changes
- theme changes
- header/footer changes

Do not use it for:

- uploading new code
- schema changes
- `.env` changes
- Agent Enterprise changes

## Required SSH Steps For Real Releases

1. update the repo clone under `~/repositories/<domain>`
2. run `node api/run-schema.cjs` when schema changed
3. update `api/.env` when env changed
4. run `npm run build`
5. sync `dist/` to the site root
6. touch `api/tmp/restart.txt`
7. verify `/health` and the live site

## Assistant Operations

- `AGENT_ENTERPRISE_URL` must point to the public Funnel origin for the Lavpris ingress
- `AGENT_ENTERPRISE_PROVISION_TOKEN` is only for installer/provisioning calls
- `AGENT_ENTERPRISE_LAVPRIS_MASTER_TOKEN` enables the full parent rollout overview on the mastersite
- `LAVPRIS_PARENT_API_URL` defaults to `https://api.lavprishjemmeside.dk` and only needs overriding if the parent API origin changes
- runtime chat uses the per-site binding values already written into `api/.env`

## Release Gate

Before you declare Lavprishjemmeside work complete:

1. update `CHANGELOG.md` under `[Unreleased]`
2. keep `local-mirror/CHANGELOG.md` aligned
3. run `npm run lavpris:release-health` from Agent Enterprise

That command fails hard if active legacy paths remain, the changelog copies drift, or the live `/health` telemetry contract is incomplete.

