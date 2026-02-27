# Checklist implementation

Companion goal: execute approved checklists with minimal drift, using test-first behavior slices plus repo-critical validation and commit order.

You have a checklist and have been tasked with following it. These are those instructions.

## Status

- Status: normative-v1
- Scope: Task implementation workflow and commit protocol
- Binding: yes

## Applicability

This process applies when a maintainer explicitly requests implementation through this document (for example: "implement this per `docs/normative/implementation.md`" or "... per `norms/implementation`" for short).

Expected directive form:

- "Execute the approved checklist per `docs/normative/implementation.md`."

Related policies:

- `AGENTS.md` (approval, validation, and stop-rule guardrails)
- `docs/ADR_POLICY.md` (decision-record requirements)
- `docs/CHANGELOG_POLICY.md` (user-visible change logging)

## Setup

If checklist execution is behavior-changing, run `npm test` and ensure that everything runs green. If tests fail, stop and ask for instructions, unless those failures are already known and explicitly accepted for this implementation.

If checklist execution is docs-only or information-gathering, skip this setup test run.

Check git status in both working trees:

- repository root
- `bundles/bundle-rantamuta`

If either working tree is dirty with files unrelated to this implementation, stop and ask what to do. The instruction may be to continue with the dirty tree. If files are related to this implementation and you are instructed to continue, fold them into the first relevant commit.

If working trees are dirty and you are instructed to continue, do not stage or commit unrelated changes. Only stage files required for the checklist item being implemented.

Check out a new git branch with a name that reflects the goal of the implementation, in the form `<verb>-<noun>` or possibly `<verb>-<adjective>-<noun>`.

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
- Run tests after implementation.
  - You may run a targeted test command for the touched scope first.
  - Run full `npm test` at the end of the behavior slice iteration or at the next natural checkpoint.
- If a test does not pass, avoid changing the test, particularly if it is a regression elsewhere.
  - Continue implementing the behavior slice until tests run green.
  - If it is necessary to change the test, print an acknowledgement and continue.
- Check off each completed checklist item with `[x]`.
- Commit all behavior-slice implementation changes with an imperative message `<slice summary>` edited for clarity and length less than 50 characters. You may add a git body.
- For each checkpoint commit (test commit and implementation commit), use dual-repository ordering:
  - Commit in `bundles/bundle-rantamuta` first if it has changes.
  - Commit in repository root second if it has changes.
  - If a repository is clean at that checkpoint, do not create a commit in that repository.
- Continue with the loop until all items are completed.

## Final validation

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

## Pull request

If the task requires a PR or the maintainer requests one, create a new PR targeting the parent branch using `gh pr create --base <target branch>`. Add a descriptive title, and use this template to write the PR body: "Previously, (bad thing happened). This PR (fixes that by doing what). We expect (describe good thing)."
