# Semantic Messaging Actor-General Amendment Implementation Checklist

## Goal

Implement the actor-general semantic messaging amendment in runtime behavior and tests so `bundle-rantamuta` dispatch semantics conform to `docs/normative/SemanticMessaging.md`.

## Scope

- Align semantic render/dispatch behavior with amended actor-general spec requirements.
- Add fail-first coverage for actor alias handling, recipient partitioning, and dedup semantics.
- Keep delivery in existing Render/Dispatch pipeline (`render.messages` + `RenderDispatch.executeRenderInstructions`).
- Update user-visible documentation/changelog if semantic output changes are externally observable.

## Non-Goals

- No scheduler/AI/NPC autonomy architecture work.
- No mutation/commit behavior redesign.
- No parser/entity-resolution redesign.
- No CLI/config/load-order compatibility changes.

## Preconditions (Command 2)

- [x] Approval to execute this checklist is explicit.
- [x] Working tree is clean in repository root.
- [x] Working tree is clean in `bundles/bundle-rantamuta`.
- [x] Branch is created and checked out with descriptive `<imperative>-<noun>` naming.
- [x] Task classification is recorded as `behavior-changing`.

## Checklist

1. [x] Add fail-first semantic renderer tests for actor alias contract.
File scope: `bundles/bundle-rantamuta/tests/semantic.message.test.js`
Acceptance criteria: add tests that assert `SEMANTIC_ACTOR_ALIAS_MISMATCH` when both `currentActor` and `currentPlayer` are present but resolve to different entity identity; assert success when both refer to same identity.
Validation commands: `npx mocha bundles/bundle-rantamuta/tests/semantic.message.test.js`

2. [x] Implement actor alias validation in semantic renderer.
File scope: `bundles/bundle-rantamuta/lib/session/semantic-message.js`
Acceptance criteria: when both actor aliases are present and identity differs, renderer returns structured failure with `SEMANTIC_ACTOR_ALIAS_MISMATCH`; valid alias mappings continue to render unchanged.
Validation commands: `npx mocha bundles/bundle-rantamuta/tests/semantic.message.test.js`

3. [x] Add fail-first dispatch tests for recipient partition and dedup rules.
File scope: `bundles/bundle-rantamuta/tests/command.dispatch.test.js`
Acceptance criteria: tests prove deterministic output order (`actor`, `target`, `others`), no duplicate delivery when actor/target/others overlap, and policy-driven inclusion/exclusion behavior for `self`, `others`, `self_and_others`, `self_target_and_others`, and `target_and_others`.
Validation commands: `npx mocha bundles/bundle-rantamuta/tests/command.dispatch.test.js --grep \"semanticEvent|recipient|dedup|target_and_others\"`

4. [x] Add fail-first dispatch test for no-partial-send on semantic render failure.
File scope: `bundles/bundle-rantamuta/tests/command.dispatch.test.js`
Acceptance criteria: for a single invalid semantic instruction, no recipient receives partial semantic output; dispatch logs failure and continues with following render instructions.
Validation commands: `npx mocha bundles/bundle-rantamuta/tests/command.dispatch.test.js --grep \"semanticEvent|partial|continues\"`

5. [x] Refactor semantic dispatch recipient construction to match spec ordering and dedup semantics.
File scope: `bundles/bundle-rantamuta/lib/session/render-dispatch.js`
Acceptance criteria: recipient membership/order is frozen before send; dedup identity is applied across actor/target/others for each semantic event; policy exclusions are applied from actor-room broadcast roots in deterministic order.
Validation commands: `npx mocha bundles/bundle-rantamuta/tests/command.dispatch.test.js --grep \"semanticEvent|recipient|dedup|ordering\"`

6. [x] Ensure semantic dispatch context includes explicit actor identity.
File scope: `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
Acceptance criteria: render dispatch context explicitly passes actor identity (not transport-derived); existing player-backed command behavior remains unchanged.
Validation commands: `npx mocha bundles/bundle-rantamuta/tests/command.dispatch.test.js --grep \"semanticEvent|currentActor|currentPlayer\"`

7. [x] Remove stale semantic renderer integration note.
File scope: `bundles/bundle-rantamuta/lib/session/semantic-message.js`
Acceptance criteria: module comments accurately describe current runtime wiring through render-dispatch.
Validation commands: `npm test -- --grep \"semantic-message|semanticEvent\"`

8. [x] Update changelog for user-visible/runtime-visible semantic behavior changes.
File scope: `CHANGELOG.md`
Acceptance criteria: unreleased entry summarizes behavior delta, why it changed, and impact/rollback notes where relevant.
Validation commands: `npm test`

9. [x] Record implementation completion status and archive checklist.
File scope: `docs/drafts/checklists/semantic-messaging-actor-general-amendment-implementation-checklist.md`, `docs/archive/implementations/`
Acceptance criteria: checklist items are checked with completion evidence; file is moved to archive after Command 2 completes.
Validation commands: `git status --short`

## Commit Plan (Recommended)

- [x] `Test semantic actor alias mismatch`
- [x] `Enforce semantic actor alias contract`
- [x] `Test semantic recipient partition rules`
- [x] `Align semantic dispatch recipient ordering`
- [x] `Document semantic dispatch behavior update`

## Verification

- [x] `npx mocha bundles/bundle-rantamuta/tests/semantic.message.test.js`
- [x] `npx mocha bundles/bundle-rantamuta/tests/command.dispatch.test.js`
- [x] `npm test`
- [x] `npm run ci:local -- --in-place` (default isolated mode could not fetch local submodule commits not present on remote)

## Approval Gate

- [x] Checklist reviewed and approved by maintainer before Command 2 execution.
