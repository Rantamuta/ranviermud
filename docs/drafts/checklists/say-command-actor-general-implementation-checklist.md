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

- [ ] Approval to execute this checklist is explicit.
- [ ] Working tree is clean in repository root.
- [ ] Working tree is clean in `bundles/bundle-rantamuta`.
- [ ] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [ ] Task classification recorded: `behavior-changing`.

## Checklist

- [ ] Confirm baseline dispatch behavior and selector handling in:
  - `bundles/bundle-rantamuta/lib/session/semantic-message.js`
  - `bundles/bundle-rantamuta/lib/session/render-dispatch.js`
  - `bundles/bundle-rantamuta/tests/command.dispatch.test.js`

- [ ] Add fail-first tests for actor-general selector support (`currentActor`) and compatibility alias behavior (`currentPlayer`) in:
  - `bundles/bundle-rantamuta/tests/command.dispatch.test.js`
  Acceptance expectation:
  - `currentActor` resolves actor identity for player and NPC actor contexts.
  - Missing actor context returns structured semantic diagnostics.

- [ ] Implement `currentActor` selector support in:
  - `bundles/bundle-rantamuta/lib/session/semantic-message.js`
  - `bundles/bundle-rantamuta/lib/session/render-dispatch.js`

- [ ] Add fail-first command-contract tests for `say` in:
  - `bundles/bundle-rantamuta/tests/say.command.test.js` (new)
  Acceptance expectation:
  - deterministic sanitization: trim, newline-to-space, whitespace collapse
  - max length: `256`
  - veto codes: `SAY_EMPTY`, `SAY_TOO_LONG`
  - success plan: one semantic event, `self_and_others`, actor selector `currentActor`, `plan.operations: [{ type: 'noop' }]`

- [ ] Implement `say` command in:
  - `bundles/bundle-rantamuta/commands/say.js` (new)
  Guardrails:
  - capture emits no output
  - no direct NPC script speech via `Broadcast.sayAt`

- [ ] Add/adjust fail-first pipeline tests for player and NPC actor delivery using existing `handleCommand(...)` entrypoint in:
  - `bundles/bundle-rantamuta/tests/command.dispatch.test.js`
  Acceptance expectation:
  - actor line: `You say, "<text>"`
  - bystander line: `<Name> says, "<text>"`

- [ ] Implement/adjust dispatch integration until pipeline tests pass.

- [ ] Update `CHANGELOG.md` with unreleased entry for `say` and actor-general selector support (Summary/Why/Impact/Migration/References/Timestamp).

## Commit Plan (Recommended)

- [ ] `Test currentActor and say dispatch`
- [ ] `Support currentActor semantic selector`
- [ ] `Test say command contract`
- [ ] `Implement say command`
- [ ] `Wire say through dispatch pipeline`
- [ ] `Document say command in changelog`

## Verification

- [ ] `npx mocha bundles/bundle-rantamuta/tests/command.dispatch.test.js`
- [ ] `npx mocha bundles/bundle-rantamuta/tests/say.command.test.js`
- [ ] `npm test`
- [ ] `npm run ci:local`

## Archive Handoff

- [ ] Move this checklist from `docs/drafts/checklists/` to `docs/archive/implementations/`.

## Approval Gate

- [ ] Checklist is complete and ready for maintainer approval before implementation.
