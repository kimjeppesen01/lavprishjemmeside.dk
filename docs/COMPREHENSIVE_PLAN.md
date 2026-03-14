# Comprehensive Plan

> Reference-only: legacy strategy/spec context. This file must not override the root handoff pack or the canonical in-folder trilogy: `requirements.md`, `design.md`, and `tasks.md`.


This document is the compact product and architecture summary for the live CMS.

## Platform Model

- Astro frontend + Node.js API CMS
- one standalone install per client domain
- SSH-first deployment to cPanel
- `dist/` is build output, not source authority

## Assistant Model

- Agent Enterprise owns the assistant runtime
- each client gets one dedicated generated agent
- CMS browser talks only to local `/assistant` routes
- CMS server reaches Agent Enterprise through the Funnel-backed Lavpris public ingress
- approved assistant tickets create Accepted-stage engineering work for Engineer

## Deployment Model

- Bolt.new -> GitHub -> cPanel remains the sync chain
- code/schema/env changes are deployed over SSH
- the publish button is only for rebuild-style content deploys from server-local code
- existing installs pull updates with `docs/UPSTREAM_UPDATES.md`
- new installs follow `docs/ROLLOUT_MANUAL.md`

## Canonical References

- `PROJECT_CONTEXT.md`
- `docs/SSH_FIRST_OPERATIONS.md`
- `docs/CLIENT_ASSISTANT_ARCHITECTURE.md`
- `docs/UPSTREAM_UPDATES.md`
- `docs/ROLLOUT_MANUAL.md`
