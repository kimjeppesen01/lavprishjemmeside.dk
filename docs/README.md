# Documentation Index

This folder is the canonical knowledge base for architecture, operations, and product design.

**Naming:** Doc filenames use `UPPERCASE_WITH_UNDERSCORES.md`; no phase/stage numbers; feature-based names only.

## Must Read (new AI session)

1. [docs/MUST_READ.md](docs/MUST_READ.md)
2. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
3. [docs/COMPREHENSIVE_PLAN.md](docs/COMPREHENSIVE_PLAN.md)
4. [docs/CLAUDE_CODE_INTEGRATION.md](docs/CLAUDE_CODE_INTEGRATION.md)

## Engineering Standards

- [docs/AI_ENGINEERING_STANDARDS.md](docs/AI_ENGINEERING_STANDARDS.md) — end-to-end best practice for AI-assisted software delivery.
- [docs/DEPLOY_HEALTHCHECK.md](docs/DEPLOY_HEALTHCHECK.md) — deploy verification and recovery.

## Deployment & Operations

- [docs/ROLLOUT_MANUAL.md](docs/ROLLOUT_MANUAL.md)
- [docs/DEPLOY_NEW_DOMAIN.md](docs/DEPLOY_NEW_DOMAIN.md)
- [docs/UPSTREAM_UPDATES.md](docs/UPSTREAM_UPDATES.md)
- [docs/MULTI_DOMAIN_CMS_PLAN.md](docs/MULTI_DOMAIN_CMS_PLAN.md)

## Product / Feature Specs

- [docs/VISUAL_PAGE_BUILDER_SPEC.md](docs/VISUAL_PAGE_BUILDER_SPEC.md) — AI visual page builder (`/admin/byggeklodser`)
- [docs/COMPONENT_LIBRARY_AND_DESIGN_SYSTEM_SPEC.md](docs/COMPONENT_LIBRARY_AND_DESIGN_SYSTEM_SPEC.md) — Component library, design tokens, AI assembly (COMPLETED)
- [docs/ADMIN_DASHBOARD_UI_IMPLEMENTATION_GUIDE.md](docs/ADMIN_DASHBOARD_UI_IMPLEMENTATION_GUIDE.md) — Admin UI implementation (styling, components, pages, ai-assemble)
- [docs/SHOPPING_MODULE_PLAN.md](docs/SHOPPING_MODULE_PLAN.md)
- [docs/IAN_PLAN.md](docs/IAN_PLAN.md)
- [docs/PEXELS_AUTOMATION_PLAN.md](docs/PEXELS_AUTOMATION_PLAN.md)
- [docs/COMPONENT_EDITOR.md](docs/COMPONENT_EDITOR.md)
- [docs/FUTURE_IMPLEMENTATIONS.md](docs/FUTURE_IMPLEMENTATIONS.md) — Nice-to-have backlog

## Task Execution Rule

- `docs/` is reference and must-read context.
- Pending executable work belongs in [`tasks/`](tasks/), not in `docs/`.
- Claude dashboard task planning should select files from `tasks/**/*.md`.
