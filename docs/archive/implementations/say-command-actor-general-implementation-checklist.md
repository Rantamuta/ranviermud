# Say Command + Actor-Selector Implementation Checklist

## Goal

Add in-pipeline `say <text>` for player and NPC actors using Render/Dispatch semantic messaging, with actor-general participant selector support.

## Scope

- Add `say` command behavior in `bundles/bundle-rantamuta`.
- Support `participants.actor: { selector: 'currentActor' }` in semantic selector handling.
- Validate delivery through existing dispatch entrypoint only: `handleCommand(state, session, input)`.
- Update changelog for user-visible command addition.

## Non-Goals

- No NPC scheduler/queue/intent architecture work.
- No area-specific coupling in runtime layers.
- No mutator behavior expansion (`noop` must use existing support).

## Preconditions (Command 2)

- [x] Approval to execute this checklist is explicit.
- [x] Working tree is clean in repository root.
- [x] Working tree is clean in `bundles/bundle-rantamuta`.
- [x] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [x] Task classification recorded: `behavior-changing`.

## Checklist

- [x] Confirm baseline dispatch behavior and selector handling in:
  - `bundles/bundle-rantamuta/lib/session/semantic-message.js`
  - `bundles/bundle-rantamuta/lib/session/render-dispatch.js`
  - `bundles/bundle-rantamuta/tests/command.dispatch.test.js`

- [x] Add fail-first tests for actor-general selector support (`currentActor`) and compatibility alias behavior (`currentPlayer`) in:
  - `bundles/bundle-rantamuta/tests/command.dispatch.test.js`
  Acceptance expectation:
  - `currentActor` resolves actor identity for player and NPC actor contexts.
  - Missing actor context returns structured semantic diagnostics.

- [x] Implement `currentActor` selector support in:
  - `bundles/bundle-rantamuta/lib/session/semantic-message.js`
  - `bundles/bundle-rantamuta/lib/session/render-dispatch.js`

- [x] Add fail-first command-contract tests for `say` in:
  - `bundles/bundle-rantamuta/tests/say.command.test.js` (new)
  Acceptance expectation:
  - deterministic sanitization: trim, newline-to-space, whitespace collapse
  - max length: `256`
  - veto codes: `SAY_EMPTY`, `SAY_TOO_LONG`
  - success plan: one semantic event, `self_and_others`, actor selector `currentActor`, `plan.operations: [{ type: 'noop' }]`

- [x] Implement `say` command in:
  - `bundles/bundle-rantamuta/commands/say.js` (new)
  Guardrails:
  - capture emits no output
  - no direct NPC script speech via `Broadcast.sayAt`

- [x] Add/adjust fail-first pipeline tests for player and NPC actor delivery using existing `handleCommand(...)` entrypoint in:
  - `bundles/bundle-rantamuta/tests/command.dispatch.test.js`
  Acceptance expectation:
  - actor line: `You say, "<text>"`
  - bystander line: `<Name> says, "<text>"`

- [x] Implement/adjust dispatch integration until pipeline tests pass.

- [x] Update `CHANGELOG.md` with unreleased entry for `say` and actor-general selector support (Summary/Why/Impact/Migration/References/Timestamp).

## Commit Plan (Recommended)

- [x] `Test currentActor selector behavior`
- [x] `Support currentActor semantic selector`
- [x] `Test say command contract`
- [x] `Test say dispatch pipeline`
- [x] `Implement say command`
- [x] `Wire say through dispatch pipeline`
- [x] `Document say command in changelog`

## Verification

- [x] `npx mocha bundles/bundle-rantamuta/tests/command.dispatch.test.js`
- [x] `npx mocha bundles/bundle-rantamuta/tests/say.command.test.js`
- [x] `npm test`
- [x] `npm run ci:local -- --in-place` (worktree mode failed because local submodule commit is not yet on remote)

## Archive Handoff

- [x] Move this checklist from `docs/drafts/checklists/` to `docs/archive/implementations/`.

## Approval Gate

- [x] Checklist is complete and ready for maintainer approval before implementation.
