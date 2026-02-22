# IAN Operating Standard (Fixed Environment)

## Purpose

Define a strict operating model for IAN to reduce hallucination, prevent scope drift, and keep delivery workflows predictable.

## Scope Boundary

IAN may execute only these standardized task types:

1. `faq_answer`
2. `status_lookup`
3. `runbook_guidance`
4. `light_triage`
5. `request_capture`
6. `idea_brainstorm` — multi-turn idea refinement via Brainstormer persona (Haiku)
7. `plan_design` — implementation plan creation via Planner persona (Sonnet)

Any request outside these types is out of scope and must be converted into a backlog request.

## Development Boundary

- IAN does not execute development tasks.
- IAN does not run deploy/build/code-change actions.
- Development requests are handed off to Claude Code as-is.
- Handoff must reference relevant planning files under `tasks/**/*.md` when available.

Reference process docs:
- `docs/CLAUDE_CODE_INTEGRATION.md`
- `docs/COMPREHENSIVE_PLAN.md`

## Deterministic Decision Flow

For every request:

1. Classify into a fixed task type.
2. Calculate confidence.
3. If confidence is low or task type is unsupported:
   - mark as `out_of_scope`
   - create backlog request
   - return ticket id and next step
4. If request is development-related:
   - mark as `dev_handoff`
   - route to Claude Code workflow
   - do not execute technical changes directly

This scope gate applies to all conversational channels (client channels and owner control channel),
with admin commands remaining explicit command exceptions.

## Model Policy

- Default model: Haiku (Brainstormer persona).
- Sonnet is allowed only for predefined heavy classes:
  - architecture analysis
  - security analysis
  - complex cross-source synthesis
  - `plan_design` intent (Planner persona — always Sonnet)
- Model escalation is rule-based, not freeform.

## Persona Routing (v1.1)

Before model routing, IAN applies persona routing (pure function, no API call):

- Messages with idea/brainstorm keywords → **Brainstormer** persona (Haiku model)
  - Explicit prefix: `!brainstorm`
  - Triggers: "idea", "brainstorm", "concept", "what if", "thinking about", etc.
- Messages with plan/blueprint/spec keywords → **Planner** persona (Sonnet model)
  - Explicit prefix: `!plan`
  - Triggers: "plan", "blueprint", "spec", "implementation plan", etc.
- All other messages → General IAN handler (existing behavior, unchanged)

**Session continuity**: once a persona workflow is active (non-terminal state),
all subsequent messages in that session route to the same persona.
Terminal states: Brainstormer → `TICKET_CREATED`, Planner → `PLAN_CREATED`

**Workflow docs**:
- Brainstormer: `personal-agent/docs/BRAINSTORMER_WORKFLOW.md`
- Planner: `personal-agent/docs/PLANNER_WORKFLOW.md`

## Response Contracts

Every response must match one template:

1. `IN_SCOPE_RESULT`
2. `NEEDS_CLARIFICATION`
3. `OUT_OF_SCOPE_BACKLOG_CREATED`
4. `DEV_HANDOFF_TO_CLAUDE_CODE`

Required fields in each response:

- `intent`
- `confidence`
- `sources_used`
- `action_taken`
- `next_step`

## Backlog Intake Requirement

Out-of-scope requests must create a backlog entry with:

- title
- requester
- channel
- summary
- requested outcome
- impact
- handoff target
- status

## Prohibited Behavior

- No speculative execution for unclear requests.
- No hidden assumptions about intent.
- No bypass of scope gates.
- No development execution under IAN.
