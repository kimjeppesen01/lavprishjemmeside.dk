# TASK: V1.1 Release Hardening (App-Focused Domains)

Status: pending  
Priority: high  
Owner: engineering/ai

## Objective

Harden the lavpris CMS release package and installation workflow for V1.1 before onboarding new app-heavy client domains (`app.[domain].dk`).

## Scope

1. Release packaging quality and cleanliness.
2. Installer and deploy docs consistency.
3. App-subdomain-first defaults in setup tooling.
4. Verification and rollout safety checks.

## Why now

Current multi-domain support is largely in place, but release artifacts and install conventions can still leak outdated files or stale examples. This increases onboarding risk for application-focused clients.

## Workstream A — Packaging hardening

1. Tighten `scripts/create-zip.sh` exclusions:
- remove local/runtime artifacts (`.DS_Store`, `.astro`, `.dmg`, temporary folders, env files, zips).
- remove obsolete root legacy docs from package input.

2. Versioned ZIP output:
- default output for this cycle: `lavpris-cms-v1.1.zip`.
- allow override via env (`ZIP_VERSION`) for patch releases.

3. Add package verification step:
- unzip listing validation.
- assert critical files exist (`README_INSTALL.md`, `scripts/setup.cjs`, `api/.env.dist`, `api/run-schema.cjs`).
- assert forbidden artifacts do not exist.

## Workstream B — Installer and domain conventions

1. Make setup defaults app-first:
- site example: `app.client.dk`
- API example: `api.app.client.dk`

2. Keep compatibility:
- custom site/API URLs remain fully configurable.
- no hard block on non-app hostnames.

3. Ensure env output aligns with deploy workflow vars:
- `PUBLIC_SITE_URL`
- `PUBLIC_API_URL`
- `DEPLOY_REPO_PATH`
- `DEPLOY_SITE_ROOT`

## Workstream C — Documentation synchronization

1. Update install docs to app-domain examples:
- `README_INSTALL.md`
- `docs/DEPLOY_NEW_DOMAIN.md`
- `docs/MULTI_DOMAIN_CMS_PLAN.md` (setup sections)

2. Add explicit release note section for V1.1 package standards:
- what is included
- what is excluded
- why

3. Ensure docs match current process rules:
- executable work in `tasks/pending/`
- reference docs in `docs/`

## Workstream D — Verification

1. Local validation:
- run packaging script
- inspect zip contents
- dry-run non-interactive setup command format

2. Deployment validation:
- verify examples support app subdomains in cPanel + GitHub variable flow.
- keep fallback compatibility for classic web domains.

## Acceptance criteria

1. V1.1 ZIP is clean and free of known stale/local artifacts.
2. Setup defaults and docs consistently use app-subdomain examples.
3. Packaging script supports versioned output naming.
4. No regression in current deploy pipeline assumptions.

## Risks / Notes

1. Over-aggressive package exclusions can remove needed project files.
2. App-first examples should not imply app-only constraints.
3. Keep `.github/workflows` included for publish/deploy continuity.

