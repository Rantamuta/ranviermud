# Tomo v1-Minimal Spec Alignment Implementation Checklist

## Goal

Bring `codex` Tomo behavior into v1-minimal compliance with `docs/normative/NpcActionArchitecture.md` by removing direct authoritative script mutation and routing Tomo actions through shared command dispatch.

## Scope

- In scope:
  - `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`
  - `bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js`
  - Any additional tests required to prove no direct mutation bypass in Tomo script
- Out of scope:
  - New persistent memory mutator design (`create memory` / `check memory`)
  - Runtime hard guardrails for all NPC scripts
  - Broad NPC scheduler redesign
  - Command lookup-hiding for NPC-only commands

## Non-Goals

- No engine/core (`Rantamuta/core`) changes.
- No unrelated codex content refactors.
- No speculative cleanup in Tomo script beyond spec-alignment requirements.

## Preconditions (Command 2)

- [x] Approval to execute this checklist is explicit.
- [x] Working tree is clean in repository root.
- [x] Working tree is clean in `bundles/bundle-rantamuta`.
- [x] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [x] Task classification recorded: `behavior-changing`.

## Checklist

- [x] Confirm and record Tomo drift points with file+line references in checklist execution notes.
  Acceptance: Execution notes list each non-compliant direct mutation/output path with path and line.
  Validation: `rg -n "moveTo\\(|metadata\\.codex|Date\\.now\\(|dispatchNpcIntent\\(" bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`
  Notes:
  - direct movement mutation: `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:311`
  - direct persisted player metadata writes: `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:100`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:104`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:108`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:113`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:117`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:120`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:122`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:125`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:231`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:237`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:238`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:244`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:250`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:251`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:262`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:263`
  - wall-clock dependency in script decisions: `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:225`, `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js:290`

- [x] Add fail-first test proving patrol path does not call direct `npc.moveTo(...)`.
  Acceptance: New/updated test fails before implementation and explicitly asserts zero `moveTo` calls for patrol.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js -g "patrol.*moveTo|moveTo.*patrol"`

- [x] Add fail-first test proving patrol emits NPC command dispatch intent instead of direct room mutation.
  Acceptance: New/updated test fails before implementation and asserts `dispatchNpcIntent` call with patrol movement intent.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js -g "patrol.*dispatch|dispatch.*patrol"`

- [x] Add fail-first test proving unsupported patrol movement path returns `UNSUPPORTED_MUTATION_OP` and does not direct-mutate.
  Acceptance: New/updated test fails before implementation with expected error code and zero direct mutation calls.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js -g "UNSUPPORTED_MUTATION_OP|unsupported patrol"`

- [x] Implement patrol movement via `CommandDispatch.dispatchNpcIntent(...)` in `tomoCaretaker.js`.
  Acceptance: Tomo patrol code path no longer invokes direct room mutation APIs; patrol movement attempts are command-dispatched.
  Validation: `rg -n "moveTo\\(|dispatchNpcIntent\\(" bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`

- [x] Ensure route index/cadence updates occur only after successful command-path movement outcome.
  Acceptance: Runtime patrol state updates are conditioned on dispatch success.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js -g "patrol.*route|patrol.*cadence|patrol.*success"`

- [x] Add fail-first test proving Tomo script does not write `player.metadata.codex.tomo`.
  Acceptance: New/updated test fails before implementation and detects metadata write attempts.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js -g "metadata.*tomo|tomo.*metadata"`

- [x] Add fail-first test proving per-player Tomo guidance memory is NPC-local ephemeral runtime state.
  Acceptance: New/updated test fails before implementation and expects NPC-local storage, not player metadata.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js -g "npc-local|ephemeral|player memory"`

- [x] Implement Tomo per-player guidance memory under NPC-local runtime storage (for example `npc.__tomoRuntime.playerMemoryById`).
  Acceptance: Script reads/writes guidance state only in NPC-local ephemeral memory and not in player persisted metadata.
  Validation: `rg -n "metadata\\.codex\\.tomo|playerMemory|__tomoRuntime" bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`

- [x] Add concise `TODO(v1-parity)` comments at Tomo decision points where persistent player-memory behavior is intentionally deferred.
  Acceptance: `tomoCaretaker.js` contains short TODO comments describing deferred command+mutator parity work, with no commented-out code blocks.
  Validation: `rg -n "TODO\\(v1-parity\\)" bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`

- [x] Add fail-first regression test proving intro/progress/completion/gallery guidance behavior remains equivalent post-migration.
  Acceptance: Test cases cover all four guidance branches and fail before migration updates.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js -g "intro|progress|completion|gallery redirect"`

- [x] Update/replace existing Tomo tests so command-path behavior and memory-location behavior are asserted explicitly.
  Acceptance: Tests no longer rely on player metadata mutation assumptions and include explicit command-dispatch assertions.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js`

- [ ] Add/adjust integration test proving Tomo movement/speech still runs through shared NPC dispatch pipeline phases.
  Acceptance: Integration coverage confirms capture->plan->commit->render path for Tomo-issued actions.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/npc.dispatch.pipeline.test.js`

- [ ] Run targeted test suite for Tomo + NPC dispatch changes.
  Acceptance: All targeted tests pass after implementation.
  Validation: `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js bundles/bundle-rantamuta/tests/npc.dispatch.pipeline.test.js bundles/bundle-rantamuta/tests/say.command.test.js`

- [ ] Run required behavior-changing validation commands.
  Acceptance: `npm test` and `npm run ci:local` both pass.
  Validation: `npm test && npm run ci:local`

- [ ] Document deferred follow-up for persistent player-memory parity via command+mutator path.
  Acceptance: Checklist execution summary includes explicit deferred item referencing v1-parity memory design work.
  Validation: `rg -n "v1-parity|persistent.*memory|command\\+mutator" docs/drafts/checklists/tomo-v1-minimal-spec-implementation-checklist.md`

## Commit Plan (Optional but Recommended)

- Test commit subject(s): `Test tomo patrol via dispatch`
- Test commit subject(s): `Test tomo avoids player metadata writes`
- Implementation commit subject(s): `Route tomo patrol through command dispatch`
- Implementation commit subject(s): `Move tomo memory to npc runtime`

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
- [ ] `npm run ci:local` run and passing.
- [ ] Additional task-specific validation:
  - `npx mocha bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js`
  - `npx mocha bundles/bundle-rantamuta/tests/npc.dispatch.pipeline.test.js`

## Archive Handoff

- [ ] Move this checklist from `docs/drafts/checklists/` to `docs/archive/implementations/`.

## Approval Gate

- [ ] Checklist is complete, unambiguous, and ready for maintainer approval before implementation.
