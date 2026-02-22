# <Task Name> Implementation Checklist

## Goal

Describe the exact behavior/output this task must produce.

## Scope

- In scope:
- Out of scope:
- Non-goals:

## Preconditions

- [ ] Approval to execute this checklist is explicit.
- [ ] Working tree is clean in repository root.
- [ ] Working tree is clean in `bundles/bundle-rantamuta`.
- [ ] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [ ] Task classification recorded:
  - `behavior-changing` or `docs/info-only`

## Item Template (Copy Per Item)

## <N>. <Imperative Item Title>

- [ ] Item approved for execution
- [ ] Files expected to change:
  - `<path>`
- [ ] Acceptance criteria:
  - `<observable result>`
- [ ] Test plan decision:
  - `required` or `omitted`
- [ ] Test omission rationale (required when omitted):
  - `<why omission is allowed>`
- [ ] Failing test command(s) (when required):
  - `<command>`
- [ ] Proof of fail-first result (when required):
  - `<failing assertion/error summary>`
- [ ] Test commit subject (`Test ...`, < 50 chars):
  - `<subject>`
- [ ] Implementation approach constraints:
  - `<must keep behavior>`
  - `<must not bypass tests>`
- [ ] Implementation commit subject (imperative):
  - `<subject>`
- [ ] Rollback note:
  - `<revert approach>`

## Execution Log (Fill During Command 2)

For each completed item:

- [ ] Item checked off in this document.
- [ ] Test commit made if required.
- [ ] Implementation commit made.
- [ ] `bundles/bundle-rantamuta` commit hash (or `clean/no commit`):
  - `<hash or note>`
- [ ] Root repo commit hash (or `clean/no commit`):
  - `<hash or note>`

## Final Validation

- [ ] Required validations per `AGENTS.md` `Validation requirements by task type` are complete and passing.
- [ ] If behavior-changing: `npm test` and `npm run ci:local` run and passing.
- [ ] If docs/info-only: skipped validations are explicitly documented with rationale.
- [ ] Any additional task-specific validation:
  - `<command>`

## Archive Handoff

- [ ] Move this checklist from `docs/drafts/checklists/` to `docs/archive/implementations/`.

## Stop for Review

- [ ] Checklist is complete, unambiguous, and ready for maintainer approval before implementation.
