# TASK: IAN Fixed-Environment Standardization

Status: pending  
Priority: high  
Owner: engineering/ai

## Objective

Make IAN reliable in a constrained, standardized operating model that reduces hallucination and ambiguity by:

1. Handling only predefined standardized task types.
2. Escalating out-of-scope requests into a request/backlog flow.
3. Keeping all development work in Claude Code (current setup, unchanged).

## Why this is needed

Current IAN instruction files are still optimized for a personal assistant workflow and broad autonomy. That creates ambiguity for support operations and can cause inconsistent behavior across Haiku and Sonnet runs.

## Target Operating Model (v1)

## A. Fixed task catalog (IAN only executes these)

- `faq_answer`: answer known product/ops questions from approved knowledge sources.
- `status_lookup`: report project/task/deploy status from approved systems.
- `runbook_guidance`: provide step-by-step guidance from existing runbooks.
- `light_triage`: classify incoming request and choose in-scope vs escalation.
- `request_capture`: create/append structured backlog request for non-standard asks.

Anything else is treated as out-of-scope.

## B. Strict scope gate

For each request, IAN must run a deterministic classifier:

1. Map request to one of allowed task types.
2. If confidence below threshold or task type not allowed -> `out_of_scope`.
3. Out-of-scope flow:
   - acknowledge limitation,
   - capture structured request,
   - create backlog ticket,
   - return ticket id + next expected SLA.

No silent improvisation.

## C. Development-task hard boundary

- IAN does **not** execute implementation/deploy/code-change tasks.
- IAN routes development asks to Claude Code workflow:
  - reference relevant `tasks/**/*.md` plan file,
  - create/append backlog item,
  - mark handoff target as Claude Code.

## D. Model policy (Haiku/Sonnet)

- Haiku default for classification and standard responses.
- Sonnet only for approved complex reasoning classes (security analysis, architecture-level synthesis).
- Model escalation must be rule-based, not freeform.

## E. Standard response contracts

All responses follow one of fixed templates:

- `IN_SCOPE_RESULT`
- `NEEDS_CLARIFICATION`
- `OUT_OF_SCOPE_BACKLOG_CREATED`
- `DEV_HANDOFF_TO_CLAUDE_CODE`

Each template contains:
- intent classification
- confidence
- sources used
- action taken
- next step

## Implementation Plan

## Phase 1 — Instruction refactor (single source of policy)

1. Create `personal-agent/docs/IAN_OPERATING_STANDARD.md`
- Canonical policy for scope, allowed task types, escalation rules, model routing.

2. Rewrite instruction stack:
- `personal-agent/SOUL.md`: identity + hard boundaries (remove ambiguous broad-assistant behavior).
- `personal-agent/USER.md`: goals and communication preferences for support role.
- `personal-agent/PLAN.md`: convert to execution roadmap for IAN standardization (not generic architecture dump).

3. Add explicit “no dev execution” rule linking to Claude Code process docs.

## Phase 2 — Deterministic task router

1. Implement fixed intent enum in router layer.
2. Add confidence threshold and fallback to clarification/out-of-scope.
3. Block tool access unless request is mapped to allowed task type.

## Phase 3 — Backlog intake flow

1. Define backlog ticket schema:
- `title`, `requester`, `channel`, `summary`, `impact`, `requested_outcome`, `handoff_target`, `status`.
2. Implement automatic ticket creation for out-of-scope requests.
3. Return ticket id in user response.

## Phase 4 — Claude Code handoff integration

1. Add explicit handoff action:
- `handoff_target = claude_code`
- link selected `tasks/**/*.md` context if available
2. Ensure no code/deploy tools run from IAN path for dev requests.

## Phase 5 — Guardrails and QA

1. Add test set:
- in-scope classification
- ambiguous request clarification
- out-of-scope backlog creation
- dev task handoff enforcement
2. Add audit fields for every decision:
- `intent`, `confidence`, `policy_decision`, `ticket_id`, `model_used`.

## Required doc/process updates

- `docs/AI_ENGINEERING_STANDARDS.md`: add section on “IAN vs Claude Code responsibility split”.
- `docs/CLAUDE_CODE_INTEGRATION.md`: add brief inbound-handoff contract from IAN.
- `PROJECT_CONTEXT.md`: add IAN fixed-environment policy summary and links.
- `tasks/pending/INDEX.md`: include this task file.

## Acceptance Criteria

- IAN handles only approved task types.
- Out-of-scope requests always generate backlog ticket and ticket id response.
- Dev requests are always redirected to Claude Code process (no direct execution).
- Haiku/Sonnet usage follows deterministic routing rules.
- Test suite proves policy enforcement paths.

## Open Decisions

1. Backlog system of record:
- Reuse existing `kanban_items` in Master Hub
- or separate IAN request queue table.

2. SLA defaults for out-of-scope requests:
- propose `triage within 1 business day`.

3. Whether IAN can ever run read-only diagnostics for dev requests before handoff.
- default recommendation: no, keep boundary strict in v1.

