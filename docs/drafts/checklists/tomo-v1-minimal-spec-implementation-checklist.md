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

- [ ] Approval to execute this checklist is explicit.
- [ ] Working tree is clean in repository root.
- [ ] Working tree is clean in `bundles/bundle-rantamuta`.
- [ ] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [ ] Task classification recorded: `behavior-changing`.

## Checklist

- [ ] Confirm baseline drift points with file/line references in `tomoCaretaker.js` and attach them to implementation notes.

- [ ] Add fail-first test: Tomo patrol does not call direct `npc.moveTo(...)`; expected path is NPC command dispatch intent.

- [ ] Add fail-first test: patrol dispatch emits `go` command intent (or structured equivalent) instead of direct room mutation.

- [ ] Add fail-first test: if patrol cannot be represented by command/mutator path, Tomo path surfaces `UNSUPPORTED_MUTATION_OP` and does not direct-mutate.

- [ ] Implement patrol routing through `CommandDispatch.dispatchNpcIntent(...)` in `tomoCaretaker.js`.

- [ ] Remove direct `npc.moveTo(...)` usage from Tomo script and update route index/cadence handling only after successful command-path outcome.

- [ ] Add fail-first test: Tomo no longer writes to `player.metadata.codex.tomo`.

- [ ] Add fail-first test: per-player Tomo guidance memory is stored in NPC-local ephemeral runtime state and remains non-authoritative.

- [ ] Implement Tomo per-player memory in NPC-local runtime (for example `npc.__tomoRuntime.playerMemoryById`) and remove all script writes to `player.metadata`.

- [ ] Add fail-first test: intro/progress/completion/gallery guidance behavior remains equivalent at gameplay level after memory migration.

- [ ] Update existing Tomo tests to assert command-path behavior and memory-location behavior explicitly (no metadata mutation fallback assertions).

- [ ] Run targeted Tomo/NPC dispatch tests and confirm they pass.

- [ ] Run full required validation for behavior-changing work: `npm test` and `npm run ci:local`.

- [ ] Document deferred follow-up explicitly: persistent player-facing memory mutations require future command+mutator design (out of this checklist scope).

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
