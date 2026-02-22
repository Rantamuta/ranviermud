# Implementation Process

This document defines the normative process for implementing approved tasks in this repository.

## Status

- Status: normative-v1
- Scope: Task implementation workflow and commit protocol
- Binding: yes

## Purpose

- Convert implementation intent into a deterministic, reviewable process.
- Reduce repeated ad hoc instructions from maintainers.
- Ensure checklist items can be executed without hidden context.

## Applicability

This process applies when a maintainer explicitly requests implementation through this document (for example: "implement this per `docs/normative/implementation.md`").

Related policies:

- `AGENTS.md` (approval, validation, and stop-rule guardrails)
- `docs/ADR_POLICY.md` (decision-record requirements)
- `docs/CHANGELOG_POLICY.md` (user-visible change logging)

## Required Two-Command Flow

### Command 1: Checklist Authoring (No Implementation)

Expected directive form:

- "Create the implementation checklist per `docs/normative/implementation.md` and stop for review."

Rules:

- MUST produce a checklist file under `docs/drafts/checklists/`.
- MUST make each item executable without interpretation.
- MUST include file scope, acceptance criteria, and validation commands per item.
- MUST stop after checklist authoring and wait for explicit approval.
- MUST NOT implement behavior changes during this phase.

### Command 2: Execute Approved Checklist

Expected directive form:

- "Execute the approved checklist per `docs/normative/implementation.md`."

Rules:

- MUST execute checklist items in order.
- MUST follow preflight, TDD, commit, and verification rules in this document.

## Preflight (Before Item 1)

- MUST confirm clean working trees in both:
  - repository root
  - `bundles/bundle-rantamuta`
- If either tree is dirty, MUST stop and request maintainer direction.
- MUST create and switch to a descriptive branch name focused on clarity.
- Branch naming SHOULD use `<imperative>-<noun>` (example: `implement-clock`).
- A third clarifying word MAY be used (example: `fix-clock-bug`).

## Checklist Item Quality Contract

Each checklist item MUST include:

- A single behavior target (or a single documentation/information target).
- Exact files expected to change.
- Acceptance criteria stated as observable outcomes.
- Test plan with explicit decision:
  - `required`, or
  - `omitted` with rationale.
- Commit subjects:
  - test commit subject (`Test ...`, under 50 characters),
  - implementation commit subject (imperative, derived from the item text).

If an item can be interpreted in two valid ways, the item is invalid until rewritten.

## Test-First Execution Rules (Per Item)

Default: tests are required for code-changing items.

Test omission is allowed only when:

1. Coverage is clearly already implemented (bias toward adding tests instead of deep coverage archaeology).
2. The checklist item does not change code (for example documentation or information gathering).

If tests are required:

- MUST design tests assuming the item is already complete.
- MUST run tests and confirm the new/updated test fails before implementation.
- MUST commit failing test(s) first.

Test commit subject rules:

- MUST begin with `Test `.
- MUST map to checklist item intent.
- MUST be clear and under 50 characters.

Implementation rules:

- MUST implement until tests are green.
- MUST NOT weaken or bypass constraints by rewriting tests.
- If a test changes after initial failure, change is allowed only when the test is incorrect.
- MUST record why the prior test was incorrect when such edits occur.

After implementation:

- MUST check off the checklist item.
- MUST commit implementation changes with an imperative subject derived from the checklist item.

## Dual-Repository Commit Ordering

This repository has two git scopes:

1. `bundles/bundle-rantamuta`
2. repository root (tracks submodule pointer plus root files)

Commit protocol for each checkpoint (test commit and implementation commit):

1. Commit in `bundles/bundle-rantamuta` first if it has changes.
2. Commit in repository root second if it has changes.

Additional rules:

- Root commit SHOULD include all changed root files for that checkpoint.
- If either repository is clean at a checkpoint, no commit is required in that repository.
- A commit MUST NOT be created for a clean tree.

## Final Validation

After all checklist items are complete:

- MUST run required validations from `AGENTS.md` `Validation requirements by task type`.
- For behavior-changing checklist execution, MUST run:
  - `npm test`
  - `npm run ci:local`
- For docs-only or information-gathering checklist execution, validation commands MAY be skipped only when the skip rationale is recorded.
- If `ci:local` is blocked by dirty-tree checks during in-progress work, `npm run ci:local -- --force` MAY be used for interim validation.
- Before final completion, validation SHOULD be re-run from a clean tree when practical.
- MUST move the completed checklist file from `docs/drafts/checklists/` to `docs/archive/implementations/`.
- MUST report results and stop when requested scope is complete.

## Failure and Stop Conditions

- If preflight conditions are not met, stop.
- If checklist ambiguity blocks deterministic execution, stop and request clarification.
- If a required behavior change is discovered outside approved checklist scope, stop and request approval.
