# TASK: Codebase Optimization & Obsolescence Audit

Status: pending  
Priority: high  
Owner: engineering/ai

## Objective

Map high-impact technical debt and obsolete/fragile patterns, then execute optimizations in controlled phases without breaking production behavior.

## Scope

- Frontend admin maintainability and bundle/runtime reliability.
- API route complexity and separation of concerns.
- Deploy and artifact strategy.
- Documentation hygiene and migration cleanup.

## Findings (prioritized)

## P0 (stability / production risk)

1. Admin pages are overgrown monoliths with large inline scripts.
- `src/pages/admin/pages.astro` (~1601 LOC)
- `src/pages/admin/master.astro` (~1140 LOC)
- Risk: regression blast radius is high; hard to test and review.
- Optimization: split into module files under `src/pages/admin/*/*.ts` and keep Astro files as composition templates.

2. Master API route is overloaded with unrelated responsibilities.
- `api/src/routes/master.js` (~1047 LOC)
- Contains: sites CRUD, kanban, AI usage, Claude run, OAuth, step-up auth, task file APIs.
- Risk: one route file controls critical control-plane + auth logic.
- Optimization: split into route modules:
  - `master-sites.js`
  - `master-kanban.js`
  - `master-claude.js`
  - shared helpers/service layer.

3. Deploy pipeline and repository state still include heavy `dist/` churn.
- `dist/` tracks ~59 files in Git.
- Risk: noisy diffs, frequent merge friction, accidental reverts/conflicts.
- Optimization options:
  - Keep current model but gate diffs strictly and avoid manual edits to `dist/`.
  - Or move to artifact-based deploy (preferred long-term).

## P1 (maintainability / delivery speed)

4. Documentation migration is partially complete with legacy roots still present as deleted/tracked churn.
- Root legacy docs are still in VCS history and create status noise.
- New canonical sources now live under `docs/` and `tasks/`.
- Optimization: complete migration cleanup in one commit (remove obsolete root references and reconcile moved files).

5. Task source-of-truth recently switched to `tasks/`, but legacy references remain.
- Current refs may still mention pre-migration root paths (e.g., `HANDOVER.md`, root-level TODO files).
- Optimization: finish cross-link normalization and ensure dashboard/user docs only reference `tasks/` for pending execution work.

6. Traffic module still has placeholder Ads integration.
- `api/src/routes/traffic.js` includes `/traffic/ads` placeholder only.
- `src/pages/admin/traffic.astro` shows “coming soon”.
- Optimization: either implement GA/Ads integration fully or feature-flag/hide tab in production until ready.

## P2 (code quality / modernization)

7. API auth/login failure diagnostics from frontend are not explicit enough.
- `src/pages/admin/index.astro` currently shows generic error text from fetch path.
- Optimization: include API host and network/transport classification in UI errors (CORS/TLS/DNS/timeout).

8. Master dashboard script has broad global exposure (`window.*`) and direct DOM imperative patterns.
- `src/pages/admin/master.astro` end-of-file global exports.
- Optimization: migrate to modular controller with scoped event handlers and typed state.

## Recommended execution plan

1. Split `api/src/routes/master.js` into focused modules without behavior change.
2. Extract `src/pages/admin/master.astro` script into dedicated JS module.
3. Extract `src/pages/admin/pages.astro` script into dedicated JS module.
4. Finalize docs migration cleanup and links.
5. Decide and document `dist/` long-term strategy.
6. Implement or hide Ads tab behind explicit feature flag.

## Acceptance criteria

- No behavior regressions in login, master hub, page builder, deploy flow.
- Route and page files each under ~400 LOC where practical.
- `tasks/` is the only pending-execution workspace.
- Documentation map has no stale references to moved TODO files.

## Verification checklist

- [ ] `npm run build` passes
- [ ] `/admin/` login success path + failure path tested
- [ ] `/admin/master` core flows tested (step-up + run guardrail)
- [ ] deploy health check runbook still valid after refactors
