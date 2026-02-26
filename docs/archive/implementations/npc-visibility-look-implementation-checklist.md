# NPC Visibility + Look Targeting Implementation Checklist

## Goal

Make room NPCs visible in room-view rendering and make `look <npc>` / `x <npc>` resolve NPC targets deterministically.

## Scope

- In scope:
- Add entity-resolution scope support for `room.npcs`.
- Add `room.npcs` to `look` direct-target scope profile.
- Render room NPC presence lines in room view.
- Add/adjust tests for resolver, look command behavior, and room-view composition.
- Update normative docs for supported scope sources and room-view composition order.
- Add a user-visible changelog entry.
- Out of scope:
- Adding a `talk` command.
- NPC AI/script behavior changes (patrol/hint logic).
- Engine core (`Rantamuta/core`) changes.
- Non-goals:
- Broad refactors of command architecture.
- Non-related UX/message rewrites.

## Preconditions

- [x] Approval to execute this checklist is explicit.
- [x] Working tree is clean in repository root.
- [x] Working tree is clean in `bundles/bundle-rantamuta`.
- [x] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [x] Task classification recorded:
  - `behavior-changing`

## 1. Add Fail-First Coverage for Missing NPC Target Resolution

- [x] Item approved for execution
- [x] Files expected to change:
  - `bundles/bundle-rantamuta/tests/entity.resolution.test.js`
- [x] Acceptance criteria:
  - A resolver test declares a command scope using `room.npcs` and fails before implementation because NPC scope source is unsupported.
  - After implementation, the same test passes and binds the expected NPC target.
- [x] Test plan decision:
  - `required`
- [x] Test omission rationale (required when omitted):
  - `n/a`
- [x] Failing test command(s) (when required):
  - `npm test -- bundles/bundle-rantamuta/tests/entity.resolution.test.js`
- [x] Proof of fail-first result (when required):
  - Test fails with `TARGET_NOT_FOUND` (or equivalent no-binding outcome) for NPC target in `room.npcs` scope.
- [x] Test commit subject (`Test ...`, < 50 chars):
  - `Test resolver room.npcs scope`
- [x] Implementation approach constraints:
  - Keep resolver deterministic and read-only.
  - Do not alter ranking/tie-break semantics beyond adding new scope source.
- [x] Implementation commit subject (imperative):
  - `Support room.npcs resolver scope`
- [x] Rollback note:
  - Revert resolver/helper scope-source changes and remove scope test.

## 2. Add Fail-First Coverage for Look Command NPC Scope

- [x] Item approved for execution
- [x] Files expected to change:
  - `bundles/bundle-rantamuta/tests/look.command.test.js`
- [x] Acceptance criteria:
  - Metadata contract test fails first because `look` direct scope excludes `room.npcs`.
  - Entity-resolution look test fails first for `look tomo` when NPC is in room NPC collection.
  - Both tests pass after command scope update.
- [x] Test plan decision:
  - `required`
- [x] Test omission rationale (required when omitted):
  - `n/a`
- [x] Failing test command(s) (when required):
  - `npm test -- bundles/bundle-rantamuta/tests/look.command.test.js`
- [x] Proof of fail-first result (when required):
  - Deep-equality metadata assertion fails and/or direct target remains unresolved.
- [x] Test commit subject (`Test ...`, < 50 chars):
  - `Test look resolves room NPCs`
- [x] Implementation approach constraints:
  - Keep existing direct look behavior for items/details/inventory unchanged.
  - Preserve command response envelopes and error codes.
- [x] Implementation commit subject (imperative):
  - `Include room.npcs in look scope`
- [x] Rollback note:
  - Revert scope-profile declaration and look-specific resolver tests.

## 3. Add Fail-First Coverage for Room View NPC Rendering

- [x] Item approved for execution
- [x] Files expected to change:
  - `bundles/bundle-rantamuta/tests/room.view.baseline.test.js`
  - `bundles/bundle-rantamuta/tests/look.command.test.js`
  - `bundles/bundle-rantamuta/tests/player.lifecycle.test.js` (if lifecycle render assertions need explicit NPC expectations)
- [x] Acceptance criteria:
  - Room-view test fails first expecting NPC presence lines when room has NPCs.
  - Room-view composition remains deterministic and existing no-NPC baselines remain unchanged.
  - Look intransitive test can assert NPC line inclusion when room has NPCs.
- [x] Test plan decision:
  - `required`
- [x] Test omission rationale (required when omitted):
  - `n/a`
- [x] Failing test command(s) (when required):
  - `npm test -- bundles/bundle-rantamuta/tests/room.view.baseline.test.js`
  - `npm test -- bundles/bundle-rantamuta/tests/look.command.test.js`
- [x] Proof of fail-first result (when required):
  - Expected NPC lines missing from room-view output.
- [x] Test commit subject (`Test ...`, < 50 chars):
  - `Test room view renders NPC lines`
- [x] Implementation approach constraints:
  - Read-only rendering path only (no world mutation).
  - Preserve stable composition order and existing formatting style.
- [x] Implementation commit subject (imperative):
  - `Render room NPC lines in room view`
- [x] Rollback note:
  - Revert room-view NPC line builder and related render assertions.

## 4. Implement Resolver Support for room.npcs

- [x] Item approved for execution
- [x] Files expected to change:
  - `bundles/bundle-rantamuta/lib/helpers/entity-resolution-helper.js`
  - `bundles/bundle-rantamuta/lib/session/entity-resolution.js`
- [x] Acceptance criteria:
  - `readScopeItems(...)` supports `room.npcs`.
  - Helper returns deterministic collection values for room NPC containers (`Set`, `Map`, iterable).
  - New and existing resolver tests are green.
- [x] Test plan decision:
  - `required`
- [x] Test omission rationale (required when omitted):
  - `n/a`
- [x] Failing test command(s) (when required):
  - `npm test -- bundles/bundle-rantamuta/tests/entity.resolution.test.js`
- [x] Proof of fail-first result (when required):
  - Resolver test from item 1 fails before code change.
- [x] Test commit subject (`Test ...`, < 50 chars):
  - `Test resolver room.npcs scope`
- [x] Implementation approach constraints:
  - No content-specific IDs or area coupling in runtime helpers.
  - Maintain breadth-first/declaration-order semantics.
- [x] Implementation commit subject (imperative):
  - `Read room NPCs in resolver scopes`
- [x] Rollback note:
  - Revert helper/switch-case additions and keep `room.npcs` unsupported.

## 5. Implement Look Command NPC Direct Scope

- [x] Item approved for execution
- [x] Files expected to change:
  - `bundles/bundle-rantamuta/commands/look.js`
- [x] Acceptance criteria:
  - `look` metadata scope profile includes `room.npcs`.
  - `look tomo` binds direct NPC target through shared resolver.
  - Existing direct/intransitive command behavior remains intact.
- [x] Test plan decision:
  - `required`
- [x] Test omission rationale (required when omitted):
  - `n/a`
- [x] Failing test command(s) (when required):
  - `npm test -- bundles/bundle-rantamuta/tests/look.command.test.js`
- [x] Proof of fail-first result (when required):
  - `look` metadata assertion and NPC direct-binding test fail prior to command update.
- [x] Test commit subject (`Test ...`, < 50 chars):
  - `Test look resolves room NPCs`
- [x] Implementation approach constraints:
  - Keep rule keys/forms unchanged (`intransitive`, `direct`).
  - Preserve current fallback render text for direct target with no description.
- [x] Implementation commit subject (imperative):
  - `Add room.npcs to look scope profile`
- [x] Rollback note:
  - Revert scope-profile entry and associated look tests.

## 6. Implement Room View NPC Presence Lines

- [x] Item approved for execution
- [x] Files expected to change:
  - `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js`
  - `bundles/bundle-rantamuta/tests/room.view.baseline.test.js`
  - `bundles/bundle-rantamuta/tests/look.command.test.js`
- [x] Acceptance criteria:
  - Room view includes NPC presence lines when NPCs exist.
  - Preferred line source: `npc.roomDesc` when authored; fallback: `You see <name> here.`
  - Composition order is explicit and deterministic in helper comments and tests.
- [x] Test plan decision:
  - `required`
- [x] Test omission rationale (required when omitted):
  - `n/a`
- [x] Failing test command(s) (when required):
  - `npm test -- bundles/bundle-rantamuta/tests/room.view.baseline.test.js`
  - `npm test -- bundles/bundle-rantamuta/tests/look.command.test.js`
- [x] Proof of fail-first result (when required):
  - Expected room-view NPC lines absent before helper update.
- [x] Test commit subject (`Test ...`, < 50 chars):
  - `Test room view renders NPC lines`
- [x] Implementation approach constraints:
  - Do not mutate room/NPC state.
  - Keep rendering deterministic across collection types.
- [x] Implementation commit subject (imperative):
  - `Render NPC presence in room view`
- [x] Rollback note:
  - Revert NPC line helper and composition insertion.

## 7. Update Normative Contract for New Scope/Rendering Behavior

- [x] Item approved for execution
- [x] Files expected to change:
  - `docs/normative/EntityResolution.md`
  - `docs/normative/CommandArchitecture.md` (only if room-view composition list requires update)
- [x] Acceptance criteria:
  - Normative docs explicitly include `room.npcs` in supported scope sources.
  - If composition order changed, room-view composition text reflects executable behavior.
- [x] Test plan decision:
  - `omitted`
- [x] Test omission rationale (required when omitted):
  - Docs-only normative update; behavior validated by test items above.
- [x] Failing test command(s) (when required):
  - `n/a`
- [x] Proof of fail-first result (when required):
  - `n/a`
- [x] Test commit subject (`Test ...`, < 50 chars):
  - `n/a`
- [x] Implementation approach constraints:
  - Keep docs aligned to implemented behavior only.
  - Avoid speculative language beyond current runtime contract.
- [x] Implementation commit subject (imperative):
  - `Document room.npcs resolver scope`
- [x] Rollback note:
  - Revert normative doc lines if behavior change is withdrawn.

## 8. Add User-Visible Changelog Entry

- [x] Item approved for execution
- [x] Files expected to change:
  - `CHANGELOG.md`
- [x] Acceptance criteria:
  - Add `Unreleased` entry documenting NPC visibility and `look` targetability update.
  - Include policy-required fields and current timestamp format.
- [x] Test plan decision:
  - `omitted`
- [x] Test omission rationale (required when omitted):
  - Changelog-only update; executable behavior validated elsewhere.
- [x] Failing test command(s) (when required):
  - `n/a`
- [x] Proof of fail-first result (when required):
  - `n/a`
- [x] Test commit subject (`Test ...`, < 50 chars):
  - `n/a`
- [x] Implementation approach constraints:
  - Keep entry concise and policy-conformant.
  - Reference behavior impact and migration/action (if none, state none).
- [x] Implementation commit subject (imperative):
  - `Record NPC look visibility change`
- [x] Rollback note:
  - Remove unreleased changelog entry if behavior change is reverted.

## Execution Log (Fill During Command 2)

For each completed item:

- [x] Item checked off in this document.
- [x] Test commit made if required.
- [x] Implementation commit made.
- [x] `bundles/bundle-rantamuta` commit hash (or `clean/no commit`):
  - `8bfd121` Test resolver room.npcs scope
  - `9b0e7af` Test look resolves room NPCs
  - `f14acbe` Test room view renders NPC lines
  - `12046f2` Read room NPCs in resolver scopes
  - `83d1f32` Add room.npcs to look scope profile
  - `bb2c446` Render NPC presence in room view
- [x] Root repo commit hash (or `clean/no commit`):
  - `722a6027` Test resolver room.npcs scope
  - `f61bb741` Test look resolves room NPCs
  - `29c19a33` Test room view renders NPC lines
  - `63696c6d` Read room NPCs in resolver scopes
  - `778beb2d` Add room.npcs to look scope profile
  - `a552f409` Render NPC presence in room view
  - `748e7b47` Document room.npcs resolver scope
  - `7f3d5182` Record NPC look visibility change

## Final Validation

- [x] Required validations per `AGENTS.md` `Validation requirements by task type` are complete and passing.
- [x] If behavior-changing: `npm test` and `npm run ci:local` run and passing.
- [x] If docs/info-only: skipped validations are explicitly documented with rationale.
- [x] Any additional task-specific validation:
  - `node util/scenario-runner.js --room codex:bell_courtyard --command "look" --command "look tomo" --command "x tomo"`
  - Note: default isolated `npm run ci:local` failed on local-only submodule commit fetch; required CI parity run succeeded with `npm run ci:local -- --in-place`.

## Archive Handoff

- [x] Move this checklist from `docs/drafts/checklists/` to `docs/archive/implementations/`.

## Stop for Review

- [x] Checklist is complete, unambiguous, and ready for maintainer approval before implementation.
