# TASK: IAN v1.1 — Brainstormer & Planner

Status: completed
Priority: high
Owner: engineering/ai
Version: 1.1

## Objective

Redesign IAN's two Slack worker identities (Haiku → Brainstormer, Sonnet → Planner)
into purpose-built workflow agents with dedicated state machines, context loading,
and Kanban integration. Rename Kanban stages to match the new workflow.

## Changes Implemented

### Python Agent

| File | Change |
|------|--------|
| `personal-agent/memory/db.py` | Migration 004: `session_metadata TEXT` column |
| `personal-agent/memory/history.py` | `get_session_metadata()` + `set_session_metadata()` |
| `personal-agent/agent/persona_router.py` | NEW — pure function persona selection |
| `personal-agent/agent/brainstormer.py` | NEW — Brainstormer state machine helpers |
| `personal-agent/agent/planner_context.py` | NEW — full-context loader for Planner |
| `personal-agent/agent/intent_router.py` | Added `IDEA_BRAINSTORM`, `PLAN_DESIGN` intents |
| `personal-agent/agent/model_router.py` | Added plan/blueprint/spec to HEAVY_KEYWORDS |
| `personal-agent/slack/handlers.py` | Persona routing + `_handle_brainstormer()` + `_handle_planner()` |

### Documentation

| File | Change |
|------|--------|
| `personal-agent/SOUL.md` | Added Personas section |
| `personal-agent/docs/IAN_OPERATING_STANDARD.md` | Added intents 6+7, Persona Routing section |
| `personal-agent/docs/BRAINSTORMER_WORKFLOW.md` | NEW — Brainstormer spec |
| `personal-agent/docs/PLANNER_WORKFLOW.md` | NEW — Planner spec |
| `BRAND_VISION.md` | NEW — per-client brand vision template |
| `BRAND_VISION_EXAMPLE.md` | NEW — completed example |

### Database & UI

| File | Change |
|------|--------|
| `api/src/schema_migrate_ian_v1_1.sql` | NEW — live migration script |
| `api/src/schema_master.sql` | Updated ENUMs: column_name, assigned_to, agent_type |
| `api/src/seed_master.sql` | Updated seed values to new ENUM names |
| `src/pages/admin/master.astro` | COLUMNS array, dropdowns, assignedLabel(), renderAgentCard() |
| `api/src/routes/master.js` | grouped object keys, FIELD() order, default column_name |

## Deployment Checklist

- [ ] Run `api/src/schema_migrate_ian_v1_1.sql` against live master DB
- [ ] Deploy API + Astro frontend (Phase E changes)
- [ ] Restart personal-agent launchd service (picks up new Python modules + Migration 004)
- [ ] Verify Kanban columns in `/admin/master/` show: Ideas, Plans, In Review, Completed
- [ ] Test Brainstormer: send "I have an idea: ..." → confirm questions (not acceptance)
- [ ] Test Planner: send "plan this: ..." → confirm 10-section plan with cost estimate

## Brainstormer State Machine

```
IDEATION → REFINEMENT → SYNTHESIS → APPROVED → TICKET_CREATED
```

- `IDEATION`: 2-3 clarifying questions (who, why, success)
- `REFINEMENT`: world-class improvement suggestions + deeper questions
- `SYNTHESIS`: structured brief ([IDEA BRIEF] format) + approval prompt
- `APPROVED`: sentinel `[BRAINSTORM:APPROVED]` in reply → creates Kanban "ideas" card
- `TICKET_CREATED`: terminal

## Planner Context Load Order

1. `BRAND_VISION.md` (root)
2. `PROJECT_CONTEXT.md` (root)
3. `docs/*.md` (all reference docs)
4. `personal-agent/docs/*.md` (IAN operating docs)

## Kanban Stage Mapping

| Old | New |
|-----|-----|
| backlog | ideas |
| in_progress | plans |
| review | in_review |
| done | completed |

| Old assigned_to | New |
|-----------------|-----|
| haiku | brainstormer |
| sonnet | planner |

## Related Files

- `personal-agent/docs/BRAINSTORMER_WORKFLOW.md`
- `personal-agent/docs/PLANNER_WORKFLOW.md`
- `personal-agent/docs/IAN_OPERATING_STANDARD.md`
- `BRAND_VISION.md` + `BRAND_VISION_EXAMPLE.md`
- `docs/IAN_PLAN.md`
