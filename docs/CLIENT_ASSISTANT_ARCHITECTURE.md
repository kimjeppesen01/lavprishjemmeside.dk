# Client Assistant Architecture

> Reference-only: internal/operator runbook or task context. External sprint agents should use the root handoff pack as execution authority.


## Summary

The CMS exposes the client assistant at `/admin/assistant/`, but the assistant runtime itself lives in Agent Enterprise. Shared cPanel hosting cannot join the tailnet, so the CMS reaches Agent Enterprise through a Funnel-backed Lavpris public ingress.

## Network Path

```text
Browser -> CMS /assistant routes -> CMS API proxy -> Funnel HTTPS URL -> Lavpris public ingress -> private Agent Enterprise control plane
```

## Public Surface

The public ingress exposes only these routes:

- `GET /health`
- `POST /api/lavpris/client-agents/provision`
- `GET /api/lavpris/sites/:siteKey/assistant`
- `PATCH /api/lavpris/sites/:siteKey/assistant/setup`
- `POST /api/lavpris/sites/:siteKey/assistant/sessions`
- `POST /api/lavpris/sites/:siteKey/assistant/sessions/:sessionId/messages`
- `POST /api/lavpris/sites/:siteKey/assistant/tickets`

Everything else returns `404`.

## Trust Boundaries

- Browser never receives site tokens or agent IDs it can override.
- CMS proxy never exposes generic Agent Enterprise chat surfaces.
- The public ingress adds an internal service token before forwarding to the private control plane.
- The private control plane treats Lavpris assistant routes as internal-only; direct external access is rejected.

## Per-Site Binding

Each site is locked to one generated client agent through:

- `AGENT_ENTERPRISE_SITE_KEY`
- `AGENT_ENTERPRISE_SITE_TOKEN`
- `AGENT_ENTERPRISE_CLIENT_AGENT_ID`

The site token authenticates the CMS install to the public ingress. One site token may not access another site’s assistant.

## CMS Behavior

- First visit opens a playful setup wizard.
- Wizard answers generate `user.md` and `soul.md` through Agent Enterprise.
- Chat sessions are always `client_support` sessions on the bound client agent.
- The client can draft engineering briefs, but Engineer handoff requires explicit approval in the CMS UI.

## Installer Behavior

`npm run setup` must be able to reach:

- `AGENT_ENTERPRISE_URL`
- `AGENT_ENTERPRISE_PROVISION_TOKEN`

If provisioning fails, setup is not complete.

## What Is Retired

- The old `personal-agent/` tree
- CMS-side IAN runtime routes and controls
- Slack-based CMS orchestration as the live assistant path

Use this document as the assistant source of truth.

