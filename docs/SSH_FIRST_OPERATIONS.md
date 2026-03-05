# SSH-First Operations

This repository is now operated in **SSH-first mode**.

## Deploy Authority

- GitHub deploy workflow is disabled (`.github/workflows/deploy.disabled.yml`).
- Production deploy/restart actions are executed from SSH operator scripts.
- GitHub remains code hosting only.

## Publish Endpoint

`POST /publish` is intentionally disabled until an SSH publish hook is wired.

## Required Operator Steps

1. SSH to host and run Node 22 environment:
   - `export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH`
2. Deploy from repo clone under `/home/theartis/repositories/<domain>`.
3. Run schema migration + restart trigger (`api/tmp/restart.txt`).
4. Verify health endpoints before considering deploy complete.
