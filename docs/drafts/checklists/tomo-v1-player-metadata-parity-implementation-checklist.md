# Tomo v1 Player-Metadata Parity Implementation Checklist

## Goal

Replace Tomo's NPC-local per-player runtime memory with persisted player metadata, while keeping all Tomo mutations inside the shared command pipeline Commit path.

## Scope

- In scope:
  - `bundles/bundle-rantamuta/lib/session/player-metadata.js`
  - `bundles/bundle-rantamuta/lib/session/mutator.js`
  - `bundles/bundle-rantamuta/commands/setplayermetadata.js`
  - `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`
  - `bundles/bundle-rantamuta/tests/player.metadata.helper.test.js`
  - `bundles/bundle-rantamuta/tests/mutator.test.js`
  - `bundles/bundle-rantamuta/tests/set-player-metadata.command.test.js`
  - `bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js`
  - `bundles/bundle-rantamuta/tests/npc.dispatch.pipeline.test.js`
  - `CHANGELOG.md` (if behavior visibility warrants entry)
- Out of scope:
  - Scheduler/queue changes
  - Combat architecture changes
  - Runtime global guardrails for all NPC scripts
  - Engine-core (`Rantamuta/core`) changes

## Non-Goals

- No unrelated refactors.
- No command lookup-hiding redesign.
- No new actor feedback envelope design.

## Key-Path Contract

- `setPlayerMetadata` must autovivify missing parent objects.
  Example: setting `foo.bar.baz` creates `foo` and `bar` if missing, then sets `baz`.
- Invalid key paths are rejected:
  - empty path or empty segment (for example `foo..bar`)
  - forbidden segment values: `__proto__`, `prototype`, `constructor`
  - intermediate segment exists but is not an object
- `getPlayerMetadata` is read-only and never autovivifies.

## Preconditions (Command 2)

- [x] Approval to execute this checklist is explicit.
- [x] Working tree is clean in repository root.
- [x] Working tree is clean in `bundles/bundle-rantamuta`.
- [x] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [x] Task classification recorded: `behavior-changing`.

## Checklist

- [x] Record execution contract notes from `docs/normative/NpcActionArchitecture.md` (shared pipeline, no script mutation fallback, unsupported mutation rule).
  Acceptance: Notes include exact constraint summary with file references.
  Validation: `rg -n "Core Invariant|Non-Negotiable Contract|Unsupported mutation rule" docs/normative/NpcActionArchitecture.md`
  Notes:
  - Source constraints: `docs/normative/NpcActionArchitecture.md:43`, `docs/normative/NpcActionArchitecture.md:51`, `docs/normative/NpcActionArchitecture.md:69`.
  - Tomo behavior logic can decide intent, but authoritative mutation/render must flow through dispatch -> plan -> commit -> render.
  - Unsupported mutation rule applies: no direct script fallback when required mutation op does not exist.

- [x] Add fail-first tests for `getPlayerMetadata(player, key, defaultValue?)` helper.
  Acceptance: New tests fail before implementation and cover missing path default, nested read, null-safe behavior, and read-only non-mutation.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/player.metadata.helper.test.js`
  Notes:
  - Existing fail-first commit in bundle history: `66ec9f2` (`Test player metadata read helper`).

- [x] Implement read-only metadata helper module.
  Acceptance: Helper is deterministic, has no writes/output side effects, and passes helper tests.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/player.metadata.helper.test.js`
  Notes:
  - Existing implementation commit in bundle history: `6654251` (`Add player metadata read helper`).

- [x] Add fail-first mutator tests for `setPlayerMetadata` instruction.
  Acceptance: New tests fail before implementation and cover successful apply+undo, rollback, invalid target, invalid key, and non-object intermediate segment.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/mutator.test.js -g "setPlayerMetadata|player metadata"`
  Notes:
  - Existing fail-first commit in bundle history: `38d53df` (`Test setPlayerMetadata mutator op`).

- [x] Implement `setPlayerMetadata` mutation in mutator.
  Acceptance: Mutator supports `setPlayerMetadata`, applies changes only in commit execution, and passes targeted mutator tests.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/mutator.test.js -g "setPlayerMetadata|player metadata"`
  Notes:
  - Existing implementation commit in bundle history: `eeb9cb4` (`Add setPlayerMetadata mutator op`).

- [x] Add fail-first tests for NPC-only `setplayermetadata` command surface.
  Acceptance: New tests fail before implementation and cover actorKindsAllowed, usage failure, player-not-found, invalid key, and plan-only success.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/set-player-metadata.command.test.js`
  Notes:
  - Existing fail-first commit in bundle history: `93b729f` (`Test npc setplayermetadata command`).

- [x] Implement NPC-only `setplayermetadata` command.
  Acceptance: Command returns structured failures, emits a `setPlayerMetadata` plan operation, and does not mutate directly.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/set-player-metadata.command.test.js`
  Notes:
  - Existing implementation commit in bundle history: `3ff2215` (`Add npc setplayermetadata command`).

- [x] Add fail-first Tomo tests requiring persisted player metadata as source of truth.
  Acceptance: New tests fail before implementation and prove runtime per-player memory is no longer authoritative.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/tomo.caretaker.script.test.js -g "persistent|metadata|runtime memory|guidance-state writes"`
  Notes:
  - Existing fail-first commit in bundle history: `ef04366` (`Test tomo metadata parity behavior`).
  - Validation currently fails by design until subsequent implementation items are complete.

- [x] Refactor Tomo reads to use persisted metadata helper.
  Acceptance: Intro/progress/completion/gallery branch decisions read from player metadata.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/tomo.caretaker.script.test.js -g "intro|progress|completion|gallery"`
  Notes:
  - `tomoCaretaker` now reads `tomo.*` keys via `getPlayerMetadata` with runtime fallback during transitional write-path migration.

- [x] Refactor Tomo writes to dispatch `setplayermetadata` through shared command pipeline.
  Acceptance: Tomo does not directly mutate player metadata or NPC per-player runtime storage for guidance state.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/tomo.caretaker.script.test.js -g "dispatch|setplayermetadata|guidance-state writes"`
  Notes:
  - Added fail-first coverage: `Test tomo guidance write dispatch` (`9ca6591` in `bundles/bundle-rantamuta`).
  - Updated legacy Tomo tests that were asserting obsolete NPC-local runtime memory behavior; new assertions require pipeline-dispatched `setplayermetadata` writes.

- [x] Remove obsolete Tomo runtime per-player guidance memory fields/comments.
  Acceptance: `playerMemoryById` and related parity TODOs are removed from authoritative Tomo guidance path.
  Validation: `rg -n "playerMemoryById|TODO\(v1-parity\)" bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`
  Notes:
  - Validation returns no matches.

- [x] Add integration coverage proving NPC metadata write command reaches commit mutator path.
  Acceptance: Integration test asserts command dispatch -> mutation plan -> mutator application for player metadata update.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/npc.dispatch.pipeline.test.js -g "metadata|commit|setplayermetadata"`

- [x] Run targeted bundle suite for all changed features.
  Acceptance: Targeted suite is green.
  Validation: `cd bundles/bundle-rantamuta && npx mocha tests/player.metadata.helper.test.js tests/mutator.test.js tests/set-player-metadata.command.test.js tests/tomo.caretaker.script.test.js tests/npc.dispatch.pipeline.test.js`

- [ ] Apply changelog policy and update `CHANGELOG.md` if required.
  Acceptance: Changelog decision is explicit (entry added or rationale documented).
  Validation: `rg -n "Tomo|metadata|setplayermetadata|NPC" CHANGELOG.md`

- [ ] Run required behavior-changing validations.
  Acceptance: `npm test` passes and `npm run ci:local` is executed; any blocked step is explicitly documented.
  Validation: `npm test && npm run ci:local`

## Commit Plan (Optional but Recommended)

- Test commit subject(s):
  - `Test player metadata read helper`
  - `Test setPlayerMetadata mutator op`
  - `Test npc setplayermetadata command`
  - `Test tomo metadata parity behavior`
- Implementation commit subject(s):
  - `Add player metadata read helper`
  - `Add setPlayerMetadata mutator op`
  - `Add npc setplayermetadata command`
  - `Route tomo memory through metadata`

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
- [ ] `npm test` run and passing.
- [ ] `npm run ci:local` run and outcome recorded.
- [ ] Additional task-specific validation:
  - `cd bundles/bundle-rantamuta && npx mocha tests/player.metadata.helper.test.js`
  - `cd bundles/bundle-rantamuta && npx mocha tests/set-player-metadata.command.test.js`
  - `cd bundles/bundle-rantamuta && npx mocha tests/tomo.caretaker.script.test.js`

## Archive Handoff

- [ ] Move this checklist from `docs/drafts/checklists/` to `docs/archive/implementations/`.

## Approval Gate

- [ ] Checklist is complete, unambiguous, and ready for maintainer approval before implementation.
