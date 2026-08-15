# AIAVRO Frontend Migration — LLM/Agent Handoff Protocol

This document exists so Antigravity, Codex, or another LLM can continue the project safely without relying on conversation memory.

## Before doing anything

Read, in order:

1. `00_MASTER_PLAN.md`
2. `01_TASK.md`
3. `02_FRONTEND_ARCHITECTURE.md`
4. `03_DESIGN_SYSTEM.md`
5. `04_API_CONTRACTS.md`
6. current module task

Then inspect the actual repository state.

## Required first response from an agent

The agent must report:

- current Git SHA
- worktree status
- current phase
- files it expects to modify
- backend files it expects to modify (normally none)
- tests it will run
- browser checks required

Do not edit before this audit if the task is architectural or cross-module.

## Change scope

One phase/module per change set.

Never combine:
- new design system
- global shell rewrite
- business logic change
- backend changes
- multiple unrelated modules

## Stop conditions

Stop and request review if:

- backend change appears necessary
- API contract is ambiguous
- existing data field semantics are unclear
- a global CSS rule is needed to fix one module
- `!important` is proposed for rendering behavior
- a timeout/RAF loop is proposed as a synchronization fix
- a full-page rerender appears necessary
- a test needs to be weakened to pass
- production data would need migration

## Final handoff format

```text
PHASE:
MODULE:
BASE SHA:
FINAL SHA:
FILES CHANGED:
BACKEND CHANGES:
API CONTRACTS:
TESTS:
BROWSER QA:
KNOWN LIMITATIONS:
ROLLBACK:
```

## Never claim

Do not say "zero errors", "production ready", or "flicker solved" based only on static tests.

For visual/performance problems, browser evidence is required.
