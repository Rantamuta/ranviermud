# <Task Name> Implementation Checklist

## Goal

Describe the exact behavior/output this task must produce.

## Scope

- In scope:
- Out of scope:

## Non-Goals

- No architecture/core changes unless explicitly approved.
- No unrelated refactors.

## Preconditions (Command 2)

- [ ] Approval to execute this checklist is explicit.
- [ ] Working tree is clean in repository root.
- [ ] Working tree is clean in `bundles/bundle-rantamuta`.
- [ ] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [ ] Task classification recorded: `behavior-changing` or `docs/info-only`.

## Checklist

- [ ] <Baseline check or context confirmation>
- [ ] <Add/adjust fail-first tests for behavior A>
- [ ] <Implement behavior A>
- [ ] <Add/adjust fail-first tests for behavior B>
- [ ] <Implement behavior B>
- [ ] <Update docs/changelog/policy if required>

Item-writing rules:

- one action per item
- short imperative sentence
- include file/path only when necessary
- include acceptance expectation inline when needed

## Commit Plan (Optional but Recommended)

- Test commit subject(s): `Test ...` (< 50 chars)
- Implementation commit subject(s): imperative form

## Execution Log (Fill During Command 2)

For each completed item:

- [ ] Item checked off in this document.
- [ ] Test commit made if required.
- [ ] Implementation commit made.
- [ ] `bundles/bundle-rantamuta` commit hash (or `clean/no commit`):
  - `<hash or note>`
- [ ] Root repo commit hash (or `clean/no commit`):
  - `<hash or note>`

## Verification

- [ ] Required validations per `AGENTS.md` `Validation requirements by task type` are complete and passing.
- [ ] If behavior-changing: `npm test` and `npm run ci:local` run and passing.
- [ ] If docs/info-only: skipped validations are explicitly documented with rationale.
- [ ] Any additional task-specific validation:
  - `<command>`

## Archive Handoff

- [ ] Move this checklist from `docs/drafts/checklists/` to `docs/archive/implementations/`.

## Approval Gate

- [ ] Checklist is complete, unambiguous, and ready for maintainer approval before implementation.
