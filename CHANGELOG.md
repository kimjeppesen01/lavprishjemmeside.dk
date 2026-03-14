# Changelog

All notable changes to Lavpris CMS are documented here.

Format: `## [version] - YYYY-MM-DD` with sections `Added`, `Fixed`, `Changed`, and `Database migrations`.
Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- `PATCH` (`1.0.x`): bug fixes, copy changes, minor UI tweaks. No schema changes. Safe to merge anytime.
- `MINOR` (`1.x.0`): new features, new components, new admin pages. May include additive schema migrations.
- `MAJOR` (`x.0.0`): breaking changes to schema, API contracts, or env var names. Requires manual migration steps.

Change discipline:

- Every Engineer, Codex, and Claude Code change that affects Lavprishjemmeside CMS behavior, client-site management behavior, rollout process, or operator expectations must update `[Unreleased]` before handoff.
- Documentation and orchestration changes belong under `Changed`.
- If a change does not affect release notes, say that explicitly in the implementation handoff.

---

## [Unreleased]

> Features developed on `main` but not yet tagged. Will become the next release.

### Added
- Implemented the first-party e-commerce module with shop schema, Flatpay / Frisbii payment integration, public storefront routes, admin shop management, and transactional order email support.

### Changed
- Removed the remaining stale references to the retired duplicate planning location from the canonical V2 docs and authority maps after the planning set was moved fully into `programs/lavprishjemmeside/`.
- Tightened the external-agent startup contract so `EXTERNAL_AGENT_PROMPT.md` and `EXTERNAL_AGENT_INSTRUCTIONS.md` now force the in-folder trilogy, require explicit documentation/handoff completion, and treat cPanel/DB/env work as operator packets rather than improviseable implementation scope.
- Moved the canonical V2 planning trilogy into `programs/lavprishjemmeside/requirements.md`, `programs/lavprishjemmeside/design.md`, and `programs/lavprishjemmeside/tasks.md` so the external sprint reads the real plan directly inside the writable folder.
- Rebuilt the V2 handoff docs around a richer hybrid product vision that restores major design/admin uplift, CMS productivity ambition, install/wizard hardening, e-commerce expansion, master AI visibility, and rollback safety in one coherent plan.
- Added `CPANEL_HANDOFF_CONTRACT.md` so database, seed, env, live verification, and rollback packets are standardized whenever the external sprint reaches an operator-owned cPanel boundary.
- Retired `SPRINT_V2_MIRROR.md` as the full sprint authority and converted it into a start-here pointer to the canonical in-folder trilogy and cPanel operator contract.
- Added an explicit handoff-artifact rule for the external sprint so schema, API, env, and workflow contract changes must leave behind updated documentation instead of living only in code.
- Added `EXTERNAL_AGENT_PROMPT.md` as a ready-to-paste startup prompt that tells a fresh external agent what to read first and what to keep in context memory throughout the sprint.
- Replaced the stale CMS V2.0 pipeline plan with a real Lavprishjemmeside V2 external sprint plan covering documentation hardening, install hardening, wizard refinement, e-commerce uplift, master AI usage visibility, master-only provider switching, and rollback/repair gates.
- Added the external-agent handoff pack in the Lavprishjemmeside root: `EXTERNAL_AGENT_INSTRUCTIONS.md`, `SPRINT_V2_MIRROR.md`, `OUTSIDE_FOLDER_DEPENDENCIES.md`, `ROLLBACK_AND_REPAIR.md`, and `DOCUMENT_AUTHORITY_MAP.md`.
- Added a baseline snapshot package for the current working version under `baselines/2026-03-14/` so the parent site and `ljdesignstudio.dk` have a documented rollback reference before the V2 sprint starts.
- Hardened the Lavprishjemmeside docs for external-agent handoff by fixing the root read order, classifying canonical/reference/historical docs, and adding reference banners to non-authoritative docs inside the folder.
- Added the Lavprishjemmeside release gate, rollout-status service, and active path-health checks so pending parent rollouts, client update drift, and stale legacy path references are surfaced before handoff.
- Added standardized release telemetry to CMS `/health`, parent/client rollout-status endpoints, and dashboard warnings so the parent site shows pending rollouts while client sites show `Opdatering tilgængelig` when they are behind `lavprishjemmeside.dk`.
- Added the `LAVPRIS_PARENT_API_URL` override plus release-health runbook updates so rollout checks, CMS docs, and installer output stay aligned even if the parent API origin changes.
- Added a hard Lavprishjemmeside engineer completion gate that requires changelog evidence from `[Unreleased]` before tasks can be marked completed.
- Fixed the product-detail shop component so the cPanel Astro build no longer aborts on the stock-status expression during live rollout.
- Fixed CMS release telemetry to read `security_logs.action` for `site.publish.completed`, so `last_deployed_at` is reported correctly after SSH-first deployments.
- Consolidated the program root docs into the essential set: `README.md`, `PROJECT_CONTEXT.md`, `BRAND_VISION.md`, and `CHANGELOG.md`.
- Updated the Engineer, Father, Lavprishjemmeside master, client-agent templates, and live client assistant packets so they explicitly understand the CMS plus the e-commerce lane: catalog, checkout, orders, shipping, discounts, and Flatpay / Frisbii payment handling.
- Added the `lavprishjemmeside-master-orchestrator` project skill for enterprise CMS and client-site governance work inside Agent Enterprise.
- Updated the Lavprishjemmeside master and Engineer packets so CMS-facing work must consider changelog impact before handoff.
- Clarified the Lavprishjemmeside authority chain so Bolt.new syncs through the public GitHub repo before Agent Enterprise deploys the cPanel live runtime over SSH.
- Added the Lavpris public-ingress split so shared cPanel CMS installs reach Agent Enterprise through Tailscale Funnel while the full control plane remains private.
- Rewrote the program-level docs around the SSH-first and Funnel-backed assistant access contract so the root manifest no longer points engineers toward the retired CMS-side IAN model.
- Verified GitHub SSH read/write access and cPanel SSH write access for Lavprishjemmeside v2.0, then aligned the Lavprishjemmeside, Father, and Engineer packets on the `Bolt.new -> GitHub -> cPanel over SSH` rollout contract.
- Added a canonical local Lavprishjemmeside mirror workflow and sync-status checks so Agent Enterprise can compare GitHub, the local checkout, and the cPanel repo before rollout.
- Normalized the remote `api/package-lock.json` drift caused by the legacy SSH npm toolchain and restored a green Lavprishjemmeside sync baseline.
- Archived the still-active GitHub Actions deploy YAML in the local mirror so GitHub stops re-committing generated `dist/` output after source-only updates.
- Audited the Lavprishjemmeside doc set and marked the remaining pre-Agent Enterprise assistant and GitHub Actions references as historical-only so the live handoff path stays SSH-first, Funnel-backed, and Agent Enterprise-owned.
- Updated the root `docs/lavpris-ssh-first-operations.md` runbook so it matches the live Mac-hosted Agent Enterprise node, current `launchd` service names, and the current cPanel restart guidance.
- Deleted the remaining archive-only Lavprishjemmeside docs and placeholder markdown files that no longer add implementation value, including the retired IAN pointer doc, archived workflow copy, empty project stubs, and stray sync-test notes.
- Updated the handoff and runtime docs so the live e-commerce module, Flatpay env contract, public/admin shop routes, and manual `schema_shop.sql` bootstrap are documented as current behavior instead of future planning.
- Created the `info@ljdesignstudio.dk` cPanel mailbox and verified the account state through cPanel email APIs and the live mail files.
- Prepared Ljdesignstudio password recovery to use `info@ljdesignstudio.dk` as the primary admin and added SMTP fallback handling because the live Resend credential is not configured.
- Added a CMS version/build contract to `/health` and the admin dashboard so client installs expose a visible build ID before update and support work.
- Rolled the missing `Egne komponenter` feature into Ljdesignstudio by deploying the sidebar/page/API bundle, applying `schema_components_source.sql`, and rebuilding with `PUBLIC_API_URL=https://api.ljdesignstudio.dk` so the client admin points at the correct backend.
- Restored CMS-driven publishing for SSH-first client installs by replacing the disabled `/publish` route with a local build-and-rsync deploy flow that uses the client-specific `PUBLIC_SITE_URL` and `PUBLIC_API_URL`.

### Database migrations
- none

---

## [1.0.0] - 2026-02-19

Initial production release. Baseline for all client installations.

### Included features
- 27-component library (hero, FAQ, pricing, testimonials, gallery, and more)
- AI Assemble for page generation from prompts
- page builder with drag-and-drop component ordering
- design-system editor for colors, typography, radius, shadows, and feature toggles
- header and footer editor
- media library with Pexels integration
- traffic dashboard (Google Search Console plus GA4)
- password reset via email (Resend)
- GitHub Actions CI/CD with auto-build and SSH deploy on push to `main`
- multi-domain support via GitHub repository variables

### Database migrations
| File | Description |
|------|-------------|
| `schema.sql` | Core tables: users, sessions, components, page_components, content_pages, design_settings, theme_presets, events, security_logs, ai_usage |
| `schema_password_reset.sql` | `password_reset_tokens` table |
| `schema_phase6.sql` | Design settings columns, theme presets, media, AI prompt settings |
| `schema_header_footer.sql` | `header_footer_settings` table |
| `schema_media.sql` | `media` table |
| `schema_page_meta.sql` | SEO/meta columns on `content_pages` |
| `schema_ai_prompt_settings.sql` | `ai_prompt_settings` table |
| `schema_design_features.sql` | Feature toggle columns on `design_settings` |
| `schema_indexes.sql` | Performance indexes |

---

## [1.1.0] - TBD

> Template - fill in when features are ready to release.

### Added
- _[feature name]: brief description_

### Fixed
- _[bug]: brief description_

### Changed
- _[behavior or workflow change]: brief description_

### Database migrations
- _none_ or `schema_v1_1_xxx.sql`: description of what it adds

### Upgrade instructions for client installs
1. Merge upstream into the client repo
2. Run `node api/run-schema.cjs` on the server (safe to re-run if additive only)
3. Restart the Node app with the cPanel runtime command documented in `local-mirror/docs/SSH_FIRST_OPERATIONS.md` or `local-mirror/docs/UPSTREAM_UPDATES.md`
4. Rebuild and sync over SSH; use the admin Publish button only for content/theme rebuilds from code that is already live on the server

---

## [1.2.0] - TBD

> Template - fill in when features are ready to release.

### Added
- _[feature name]: brief description_

### Fixed
- _[bug]: brief description_

### Changed
- _[behavior or workflow change]: brief description_

### Database migrations
- _none_ or `schema_v1_2_xxx.sql`: description

### Upgrade instructions for client installs
1. Merge upstream into the client repo
2. Run `node api/run-schema.cjs` on the server
3. Restart the Node app with the cPanel runtime command documented in `local-mirror/docs/SSH_FIRST_OPERATIONS.md` or `local-mirror/docs/UPSTREAM_UPDATES.md`
4. Rebuild and sync over SSH; use the admin Publish button only for content/theme rebuilds from code that is already live on the server

---

## How to release a new version

1. Finish all features on `main`
2. Fill in the `[Unreleased]` section above and rename it to the new version plus date
3. Add a new empty `[Unreleased]` section at the top
4. Bump `"version"` in `package.json`
5. Commit: `git commit -m "chore: release vX.Y.Z"`
6. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
7. Create a GitHub release: `gh release create vX.Y.Z --title "vX.Y.Z" --notes "See CHANGELOG.md"`
8. Roll out to each client repo and verify site plus API health
