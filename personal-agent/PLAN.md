# IAN Plan — Fixed Environment Rollout

## Objective

Implement a standardized, low-ambiguity operating model for IAN with strict scope control and Claude Code handoff for development work.

## Phase 1 (Current) — Policy and Instruction Refactor

Deliverables:

1. Canonical policy doc:
   - `personal-agent/docs/IAN_OPERATING_STANDARD.md`
2. Instruction rewrites:
   - `personal-agent/SOUL.md`
   - `personal-agent/USER.md`
   - `personal-agent/PLAN.md`
3. Hard rule:
   - development tasks are routed to Claude Code only

Status: completed

## Phase 2 — Deterministic Router

1. Add fixed intent enum for supported task classes.
2. Add confidence threshold and forced clarification/out-of-scope fallback.
3. Prevent tool execution when intent is unsupported.

Status: completed

## Phase 3 — Backlog Request Flow

1. Define request ticket schema.
2. Auto-create ticket for out-of-scope requests.
3. Return ticket id and SLA in response template.

Status: completed

## Phase 4 — Claude Code Handoff Contract

1. Standard handoff payload for development requests.
2. Include linked `tasks/**/*.md` planning context when available.
3. Enforce no direct execution by IAN for dev asks.

Status: completed

## Phase 5 — QA and Audit

1. Add tests for:
   - in-scope execution
   - low-confidence clarification
   - out-of-scope backlog creation
   - dev handoff enforcement
2. Add audit fields:
   - intent
   - confidence
   - policy_decision
   - ticket_id
   - model_used

Status: completed

## Success Criteria

1. IAN executes only approved task classes.
2. Out-of-scope always results in backlog ticket creation.
3. Development tasks always hand off to Claude Code.
4. No freeform model escalation outside policy.
