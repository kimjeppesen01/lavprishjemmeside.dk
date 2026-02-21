# MUST READ: Session Start Protocol

Read this at the start of every new implementation session.

## Required order

1. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
2. [docs/COMPREHENSIVE_PLAN.md](docs/COMPREHENSIVE_PLAN.md)
3. [docs/CLAUDE_CODE_INTEGRATION.md](docs/CLAUDE_CODE_INTEGRATION.md)
4. [docs/DEPLOY_HEALTHCHECK.md](docs/DEPLOY_HEALTHCHECK.md)
5. [tasks/README.md](tasks/README.md)

## Working contract

- `docs/` is canonical architecture and operations context.
- `tasks/` is canonical execution queue and planning workspace.
- Do not create new pending work items under `docs/`; create or update files under `tasks/pending/`.
- Every non-trivial code change must end with deploy smoke checks (build + API restart trigger + health check).

## Definition of done

- Code implemented.
- Relevant docs updated.
- Task file updated with status and outcome.
- Post-implementation verification executed.
