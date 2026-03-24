# Checklist implementation

Companion goal: execute approved checklists with minimal drift, using test-first behavior slices plus repo-critical validation and commit order.

You have a checklist and have been tasked with following it. These are those instructions.

## Status

- Authority: normative
- Scope: Task implementation workflow and commit protocol
- Binding: yes

## Applicability

This process applies when a maintainer explicitly requests implementation through this document (for example: "implement this per `docs/normative/implementation.md`" or "... per `norms/implementation`" for short).

Expected directive form:

- "Execute the approved checklist per `docs/normative/implementation.md`."

Related policies:

- `AGENTS.md` (approval, validation, and stop-rule guardrails)
- `docs/CHANGELOG_POLICY.md` (user-visible change logging)
- `docs/normative/ArtifactLifecycle.md` (working-artifact lifecycle vocabulary and transitions)

## Setup

First, carefully review the originating plan. Then compare it to the implementation checklist. If there is any drift you must stop and highlight the drift. That is, if the checklist introduces new code that is not in the plan, or if the checklist does not implement ideas that are in the plan, this is drift and you must stop and highlight the problem.

Next, review the checklist for quality. If implementing the checklist will cause a drop in quality or cause other problems, you must stop and highlight the problem.

If checklist execution is behavior-changing, run `npm test` and ensure that everything runs green. If tests fail, stop and ask for instructions, unless those failures are already known and explicitly accepted for this implementation.

If checklist execution is docs-only or information-gathering, skip this setup test run.

Check git status in both working trees:

- repository root
- `bundles/bundle-rantamuta`

If either working tree is dirty with files unrelated to this implementation, stop and ask what to do. The instruction may be to continue with the dirty tree. If files are related to this implementation and you are instructed to continue, fold them into the first relevant commit.

If working trees are dirty and you are instructed to continue, do not stage or commit unrelated changes. Only stage files required for the checklist item being implemented.

Check out a new git branch with a name that reflects the goal of the implementation, in the form `<verb>-<noun>` or `<verb>-<adjective>-<noun>`.

- Branch names SHOULD use lowercase kebab-case tokens.
- Prefer names that describe the behavior or contract being implemented rather than an internal codename.

If the working tree is dirty at this stage, `git add . && git commit -m "Init <implementation>"` where implementation is suitably descriptive.

## Artifact Lifecycle Handling

Checklist execution is governed by `docs/normative/ArtifactLifecycle.md`.

Before starting the first checklist item:

- update the related task artifacts, including the approved checklist and its source plan, to `Status: active`
- treat the approved checklist as the execution tracker for the task while keeping lifecycle status synchronized across the related task artifacts
- any task-specific implementation working document created during execution MUST use `Status: active` when it enters the task artifact set

For task-completion archival:

- the executed checklist, its source plan, and any task-specific implementation working artifacts MUST all be updated to `Status: archived`
- any related design or working document that is fully represented by the completed task artifacts and is no longer needed for later phases MUST also be archived with that task artifact set
- related design or working documents that remain intended for later phases MAY remain outside the archive
- those archived artifacts MUST all be moved into appropriate locations under `docs/archive/**`
- the status updates and archive moves for those artifacts MUST be committed together in one commit

## Validation selection

For each behavior slice, choose the primary validation path from the approved plan, checklist validation handoff, and `AGENTS.md` requirements.

Use these defaults unless the approved plan requires something more specific:

- behavior or contract change: prefer fail-first unit or integration coverage
- build, CI, or tooling change: prefer contract/parity checks plus smoke validation
- docs-only or governance-only change: validate references, cited commands, and documented evidence consistency

Prefer behavior-level evidence over tool-internal assertions when both are available.

## Loop

Stop with any questions, or if implementing the task requires expanding beyond the scope of what was agreed in the checklist.

- Choose the first unchecked item of the checklist.
- If the first unchecked item depends on another unchecked item, complete the prerequisite item first.
- Group dependent checklist items into a single behavior slice when they implement one coherent behavior change.
  - A behavior slice MUST remain within checklist scope and MUST list which items it satisfies.
- If the behavior slice involves a behavioral or code change, then:
  - Write a unit/integration test that assumes the behavior slice has been changed. This test is expected to fail.
  - One failing test commit MAY cover multiple dependent checklist items in that slice.
  - Commit that failing test change with the message `Test <slice summary>`, edited for clarity and length. The message must be no more than 50 characters. If longer explanation is needed, you may add a git body.
- If an item is mechanical only (for example type plumbing, constant/table wiring, rename-only, or internal refactor with no direct behavior contract), you may implement it within the current behavior slice without adding a dedicated failing test for that single item.
- If the item is docs-only or non-code, skip the failing-test step for that item.
- Implement the selected behavior slice as written in the checklist.
- After the fail-first step is in place, prefer fixing production code over rewriting tests.
- Run tests after implementation.
  - You may run a targeted test command for the touched scope first.
  - Run full `npm test` at the end of the behavior slice iteration.
- If a test does not pass, avoid changing the test, particularly if it is a regression elsewhere.
  - Continue implementing the behavior slice until tests run green.
  - If it is necessary to change the test, print an acknowledgement and continue.
- Check off each completed checklist item with `[x]`.
- Commit all behavior-slice implementation changes with an imperative message `<slice summary>` edited for clarity and length less than 50 characters. You may add a git body.
- Complete slice cadence before starting the next slice: test commit, implementation, passing tests, implementation commit.
- Continue with the loop until all items are completed.

## Stop conditions

Pause and confirm direction when:

- proposed changes exceed approved checklist scope
- normative docs or other governing references conflict
- unexpected repo state risks unrelated work
- green cannot be restored for the current slice without changing tests to mask behavior, or without editing out-of-scope code
- the checklist no longer matches the implementation reality closely enough to proceed safely

## Final validation

After all checklist items are complete:

- MUST run required validations from `AGENTS.md` `Validation requirements by task type`.
- For behavior-changing checklist execution, MUST run:
  - `npm test`
  - `npm run ci:local`
- For docs-only or information-gathering checklist execution, validation commands MAY be skipped only when the skip rationale is recorded.
- If `ci:local` is blocked by dirty-tree checks during in-progress work, `npm run ci:local -- --force` MAY be used for interim validation.
- Before final completion, validation SHOULD be re-run from a clean tree when practical.
- MUST archive the task's working artifacts per `ArtifactLifecycle.md`:
  - update the executed checklist, source plan, and any task-specific implementation working artifacts to `Status: archived`
  - archive any related design or working document that is fully represented by the completed task artifacts and no longer needed for later phases
  - move those archived artifacts into appropriate locations under `docs/archive/**`
  - commit those status changes and archive moves together in one commit
- MUST report results and stop when requested scope is complete.

## Pull request

If the task requires a PR or the maintainer requests one, create a new PR targeting the parent branch using `gh pr create --base <target branch>`. Add a descriptive title, and use this template to write the PR body: "Previously, (bad thing happened). This PR (fixes that by doing what). We expect (describe good thing)."
