# Normative Documents

This directory contains the normative contracts and workflow rules for this repository.

## Purpose

- Make compatibility-impacting behavior explicit in-repo.
- Make planning, checklist, and implementation workflow expectations explicit in-repo.
- Prevent drift between implementation, tests, and maintainer expectations.
- Provide versioned contracts that can be changed intentionally.

## Current normative set

- `CommandArchitecture.md`
  - Defines the phase model (`Receive Input` through `Render/Dispatch`), including deterministic input canonicalization before parse.
- `EntityResolution.md`
  - Defines read-only entity binding, deterministic scope/disambiguation behavior, and resolver failure ownership.
- `checklist.md`
  - Defines the checklist-authoring phase between approved planning and checklist execution.
- `plan.md`
  - Defines planning conventions, approval gating, traceability expectations, and plan QA expectations.
- `implementation.md`
  - Defines checklist execution (setup, validation selection, behavior-slice test-first loop, stop conditions, and repo-specific validation/commit order).
- `PredicateStateRendering.md`
  - Defines predicates as the authoritative, render-only mechanism for state-dependent room description rendering (`descriptionVariants` / `descriptionFragments`).
- `TypecheckPolicy.md`
  - Defines the required triage and remediation workflow for typecheck failures, including type-only defaults and behavior-change escalation.
- `VirtualDoor.md`
  - Defines virtual-door pairing, lifecycle ownership, mutation/query semantics, and door command/movement behavior.

## Related implementation docs (non-normative)

- `../BundleRantamutaTechnicalManual.md`
  - Bundle-level implementation map (file-by-file runtime flow, hooks, mutator, rendering, and scenario/test surfaces).
- `../ProjectDirection.md`
  - Project mission and direction summary, including the working definition of the Rantamuta approach.

## Proposed normative extensions (in review)

- `SemanticMessaging.md`
  - Draft semantic-event render/dispatch contract for perspective-aware audience messaging via render-phase delivery instructions.
- `NpcActionArchitecture.md`
  - Proposed actor-general NPC action architecture, including the non-negotiable NPC script mutation boundary contract.

## Precedence

When documents conflict, precedence is:

1. Explicit user direction for the active task.
2. `AGENTS.md` repository guardrails.
3. Files in `docs/normative/` (this directory).
4. Non-normative docs under `docs/`.

If two normative docs conflict, the more specific document for the affected subsystem wins.

## Change control

- Treat changes here as compatibility-impacting unless explicitly noted otherwise.
- Any PR that changes files in `docs/normative/` should:
  - state what behavior changed and why,
  - include validation updates/tests if behavior is executable,
  - add or update changelog entries when user-visible behavior changes.
