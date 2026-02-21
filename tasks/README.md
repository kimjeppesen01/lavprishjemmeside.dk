# Tasks Workspace

This folder is the canonical execution workspace for Claude dashboard task planning.

## Structure

- `tasks/pending/` — backlog and planned work
- `tasks/kanban/` — generated task plan files linked to Kanban tasks
- `tasks/done/` — completed task records (optional archive)

## Rules

- All new actionable work items go in `tasks/pending/`.
- Keep `docs/` for stable reference only.
- When starting implementation from dashboard:
  - select existing `.md` under `tasks/`, or
  - create a new plan file under `tasks/kanban/`.

## File naming

- Pending: `TASK_<domain>_<short-name>.md`
- Kanban generated: `tasks/kanban/<version>-task-<id>-<slug>.md`
