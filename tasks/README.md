# Tasks Workspace

> Historical/reference only: this workspace is not the execution authority for the external sprint.

Kanban-style task management, organized by domain. **Ideas and plans are domain-only** (not in cms/).

## Structure

```
tasks/
├── cms/                        # Completed/historical CMS items only; no new ideas/plans here
│   ├── ideas/                  # (empty — use domain folders)
│   ├── plans/                  # (empty)
│   ├── in_review/
│   └── completed/              # Done CMS-level tasks
├── lavprishjemmeside.dk/       # Client: lavprishjemmeside.dk
│   ├── ideas/                  # Early scoped tasks for this domain
│   ├── plans/                  # Implementation plans for this domain
│   ├── in_review/
│   └── completed/
├── ljdesignstudio.dk/          # Client: ljdesignstudio.dk
│   ├── ideas/
│   ├── plans/
│   ├── in_review/
│   └── completed/
└── README.md
```

## Kanban columns

| Folder | Stage | Description |
|--------|-------|-------------|
| `ideas/` | Ideas | Raw or early-scoped tasks awaiting planning |
| `plans/` | Plans | Implementation plan ready for execution |
| `in_review/` | In Review | Under review or testing |
| `completed/` | Completed | Done and archived |

## Domain routing

Agent Enterprise planning workflows should use **only domain folders** for ideas and plans:
- **Client work** → `tasks/{domain}/ideas/` and `tasks/{domain}/plans/` (e.g. lavprishjemmeside.dk, ljdesignstudio.dk)
- **Control channel** → `cms/` holds completed or historical items only; no new ideas or plans in cms/

## File naming

`TASK_{SLUG}.md` — generated from the active planning workflow.

## Rules

- All new tasks start in `{domain}/ideas/`
- Planning workflows may move tasks from `ideas/` → `plans/`
- Keep `docs/` for stable reference documentation only
