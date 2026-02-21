# AI Engineering Standards

Comprehensive best-practice framework for running this project as an AI-assisted software system.

## 1. Delivery Lifecycle

1. Intake: convert request into a scoped task file in `tasks/pending/`.
2. Plan: define constraints, acceptance criteria, risks, and rollback.
3. Implement: smallest safe change set, no unrelated refactors.
4. Verify: lint/build/runtime checks and targeted functional tests.
5. Deploy: automated pipeline with post-deploy health gate.
6. Learn: document incident findings and update runbooks.

## 2. Documentation Architecture

- `docs/`: stable reference (architecture, operations, specs, runbooks).
- `tasks/`: execution artifacts (backlog, active plans, implementation notes, done logs).
- Never mix the two concerns.

## 3. Task File Standard (`tasks/**/*.md`)

Each active task should include:

- Objective
- Scope / non-scope
- Inputs and dependencies
- Acceptance criteria
- Risks
- Implementation checklist
- Verification checklist
- Result summary

## 4. Code Change Rules

- Keep changes atomic and reviewable.
- Preserve backward compatibility unless explicitly approved.
- Protect high-risk paths: auth, deploy, schema, payments, production ops.
- For schema changes: additive-first migration strategy, with rollback notes.

## 5. Security Baseline

- Least privilege for runtime secrets and automation tokens.
- No secrets in repository.
- Enforce server-side validation for all guardrails.
- Audit sensitive operations (`/master/*`, deploy actions, auth flows).
- Apply rate limiting with IPv6-safe keying.

## 6. Reliability & Deploy

- CI deploy must be deterministic (`npm ci --omit=dev` fallback allowed).
- API restart via `tmp/restart.txt` in CI.
- Post-deploy API `/health` retries are mandatory.
- Deploy fails if health never recovers.

## 7. Observability

- Structured error logs and actionable messages.
- Health endpoints must validate dependency state (DB connected).
- Every incident should produce one runbook update.

## 8. AI-Specific Guardrails

- Every autonomous run must be anchored to a task plan file.
- Require explicit “existing plan or create new plan” decision.
- Log context provenance (task id + plan path).
- Keep prompts reproducible by recording plan source.

## 9. Quality Gates

- Pre-merge: syntax + build + critical route smoke tests.
- Post-merge: deploy health and login path smoke tests.
- No “green” release without both checks.

## 10. Session Hygiene

- Start with [docs/MUST_READ.md](docs/MUST_READ.md).
- End by updating:
  - the task file in `tasks/`
  - relevant reference docs in `docs/`
  - deploy/health evidence when production paths were touched.
