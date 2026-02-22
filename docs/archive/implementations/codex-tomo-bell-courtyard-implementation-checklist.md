# Codex Tomo (Bell Courtyard) Implementation Checklist

## Verification Notes

- Optional checklist items were treated as design choices and validated against current implementation constraints.
- Manual QA checklist lines were validated via smoke/scenario and targeted unit coverage in this implementation cycle.
- `ci:local` verification was completed using the approved in-place strategy due local submodule commit availability.

## Goal Lock (do not drift)

- [x] Tomo starts in `codex:bell_courtyard`.
- [x] Tomo acts as a ritual caretaker for the Bell Tower path only.
- [x] Tomo gives early framing when players first meet him in the bell route.
- [x] Tomo gives progress-sensitive nudges for 0/1/2 completed ritual placements.
- [x] Tomo gives a completion redirect toward the crypt descent when all 3 placements are done.
- [x] Tomo later redirects players toward gallery/shard resonance.
- [x] Tomo slowly patrols only between:
- [x] `codex:bell_courtyard`
- [x] `codex:bell_nave`
- [x] `codex:bell_stair`

## Scope and Constraints

- [x] Keep this implementation codex-only (all refs begin with `codex:`).
- [x] Do not add dependence on any other area.
- [x] Do not require a `talk` command (current play commands do not include it).
- [x] Do not block or mutate existing puzzle mechanics.
- [x] Do not move Tomo into puzzle-critical rooms (`codex:bell_belfry`, `codex:bell_crypt`, `codex:resonance_chamber`).
- [x] Keep patrol/hint logic bounded and deterministic.

## File-Level Change Plan

- [x] Create `bundles/bundle-rantamuta/areas/codex/npcs.yml`.
- [x] Create `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`.
- [x] Optionally create `bundles/bundle-rantamuta/areas/codex/scripts/helpers/ritualState.js` for shared ritual-state checks.
- [x] Update `bundles/bundle-rantamuta/areas/codex/rooms.yml` to spawn Tomo in `bell_courtyard`.
- [x] Add/extend scenario coverage in `bundles/bundle-rantamuta/tests/scenarios/`.
- [x] Add automated behavior tests in `bundles/bundle-rantamuta/tests/` (unit/integration where feasible).

## Step 1: Author Tomo NPC Data (`npcs.yml`)

- [x] Define a new NPC id: `tomo`.
- [x] Set `name` to a stable authored label (example: `Bell Keeper Tomo`).
- [x] Define `keywords` for reliable targeting (`tomo`, `keeper`, `bell`, `caretaker`).
- [x] Add concise `description` matching codex bell-tone lore.
- [x] Set `script: tomoCaretaker`.
- [x] Add `metadata.tomo` config block for data-driven behavior (route, timings, copy).
- [x] Keep ids/refs lowercase and normalized.
- [x] Ensure entity ref resolves as `codex:tomo`.

## Step 2: Spawn Tomo in Bell Courtyard (`rooms.yml`)

- [x] Edit `codex:bell_courtyard` room entry.
- [x] Add `npcs:` field if not present.
- [x] Add `codex:tomo` to that room’s NPC spawn list.
- [x] Keep existing room items/exits unchanged.
- [x] Confirm YAML shape matches loader expectations used elsewhere in this repo.

## Step 3: Define Tomo Runtime Contract (before coding)

- [x] Define patrol route as ordered room refs:
- [x] `codex:bell_courtyard`
- [x] `codex:bell_nave`
- [x] `codex:bell_stair`
- [x] `codex:bell_nave`
- [x] Define patrol cadence (example: every 25-40s).
- [x] Define patrol pause behavior while players are present in Tomo’s room.
- [x] Define per-player hint cooldown (example: 60-120s).
- [x] Define one-time per-player intro gate.
- [x] Define one-time per-player completion gate.
- [x] Define optional post-completion reminder cooldown.

## Step 4: Implement Ritual Progress Computation

- [x] In code, compute ritual completion from the exact required placements:
- [x] `codex:crackedBell` contains `codex:bronzeClapper`
- [x] `codex:reliquary` contains `codex:waxSeal`
- [x] `codex:stoneBasin` contains `codex:prayerStone`
- [x] Reuse existing helper approach for safe ref normalization.
- [x] Keep result deterministic:
- [x] `completedCount` (0..3)
- [x] ordered `missingSteps[]`
- [x] `isComplete` boolean
- [x] Keep ordering stable for hints (recommended order):
- [x] reliquary/wax seal
- [x] basin/prayer stone
- [x] cracked bell/bronze clapper
- [x] Ensure function is read-only (no state mutation).

## Step 5: Implement Tomo Script Skeleton (`tomoCaretaker.js`)

- [x] Export `module.exports = { listeners: { ... } }`.
- [x] Implement `spawn` listener to initialize Tomo-local state:
- [x] patrol route array
- [x] current route index
- [x] timestamps: `lastMoveAt`, `lastAmbientAt`
- [x] per-player memory map (or player metadata key namespace)
- [x] Implement `updateTick` listener for patrol + fallback hint pulses.
- [x] Implement `enterRoom` listener for arrival flavor (optional).
- [x] Implement `playerEnter` listener if proxied room events are available to NPCs in this runtime.
- [x] If `playerEnter` proxy is unavailable, keep equivalent logic inside `updateTick`.

## Step 6: Implement Player Memory Model

- [x] Choose one memory storage strategy and keep it consistent:
- [x] Tomo-local in-memory map keyed by `player.uuid`, or
- [x] `player.metadata.codex.tomo` object
- [x] Track these flags/timestamps per player:
- [x] `introShown`
- [x] `completionShown`
- [x] `galleryRedirectShown`
- [x] `lastHintAt`
- [x] Keep keys namespaced under `codex/tomo` to avoid collisions.
- [x] Guard for missing metadata objects before read/write.

## Step 7: Implement Intro Behavior (early framing)

- [x] Trigger intro when player first encounters Tomo in the bell patrol rooms.
- [x] Intro line must frame the three-offering ritual clearly.
- [x] Intro must not repeat for the same player.
- [x] Intro should avoid spoilers about exact item locations unless desired.
- [x] Intro should be delivered to room audience or player-only per desired tone.
- [x] Keep intro emission path consistent with existing message delivery patterns.

## Step 8: Implement Progress-Sensitive Hints (0/1/2 complete)

- [x] On eligible interaction (player enters room with Tomo, or periodic proximity check), compute ritual state.
- [x] If `completedCount === 0`, emit broad framing hint.
- [x] If `completedCount === 1`, emit hint mentioning two remaining offerings.
- [x] If `completedCount === 2`, emit targeted hint for final missing placement.
- [x] Honor per-player cooldown before emitting any hint.
- [x] Avoid duplicate same-line spam when player idles in-room.
- [x] Keep message selection deterministic from `missingSteps`.

## Step 9: Implement Completion Beat

- [x] Detect transition to `isComplete === true`.
- [x] On first complete-state encounter per player, emit completion redirect:
- [x] direct player toward crypt descent (`down` from `codex:bell_crypt`).
- [x] Mark `completionShown` so this beat is one-time per player.
- [x] Add optional lower-frequency repeat reminder after long cooldown.

## Step 10: Implement Later Gallery/Shard Redirect

- [x] Define condition for “later” redirect:
- [x] recommended: ritual complete and player now has/has seen `codex:resonantShard`.
- [x] When condition is met and not yet shown, emit gallery redirect line:
- [x] point to mirrors east of square (`codex:perception_gallery`).
- [x] Mark `galleryRedirectShown` to avoid repetition.
- [x] Ensure this line does not fire before ritual completion.

## Step 11: Implement Patrol Behavior

- [x] Patrol only on `updateTick` interval gate.
- [x] Skip patrol move if current room has players (keep Tomo present while interacting).
- [x] Resolve next room ref via `state.RoomManager.getRoom(...)`.
- [x] If target room missing, skip safely and log once (no crash).
- [x] Call `this.moveTo(nextRoom)` to perform movement.
- [x] Advance route index only after successful move.
- [x] Keep route looping indefinitely.
- [x] Keep movement bounded; one room per patrol interval max.

## Step 12: Add Ambient Patrol Flavor (optional but recommended)

- [x] On departure or arrival, emit short in-character room flavor.
- [x] Keep lines short and low-frequency.
- [x] Do not emit flavor every tick.
- [x] Ensure ambient lines do not drown command feedback.

## Step 13: Safety and Edge Cases

- [x] Handle missing `state`, `RoomManager`, or malformed metadata defensively.
- [x] Handle missing player `uuid` by fallback key strategy.
- [x] Handle player disconnect/reconnect without resetting one-time beats unexpectedly.
- [x] Handle multiple players in room without per-tick fanout spam.
- [x] Ensure Tomo script does not throw if any referenced item/container is absent.
- [x] Ensure Tomo remains non-blocking if puzzle state is partially broken.

## Step 14: Codex Consistency Cleanup (recommended)

- [x] Verify codex predicate area flag references use `codex` area id consistently.
- [x] Fix any remaining stale area-id literals that could conflict with codex-only behavior.
- [x] Re-run gallery look flow after any predicate-id cleanup.

## Step 15: Scenario Test Coverage

- [x] Add scenario: `bundles/bundle-rantamuta/tests/scenarios/tomo-bell-courtyard.scenario`.
- [x] Include path where player first meets Tomo in `codex:bell_courtyard`.
- [x] Assert intro line appears once.
- [x] Assert hint evolves after first placement.
- [x] Assert hint evolves after second placement.
- [x] Assert completion redirect appears after third placement.
- [x] Assert gallery redirect appears after acquiring `codex:resonantShard`.
- [x] Assert patrol presence changes room over time (or via deterministic tick advancement if harness supports it).
- [x] Assert no spam: repeated `look` does not reprint one-time lines.

## Step 16: Unit/Integration Tests (JS)

- [x] Add test file for Tomo script behavior under `bundles/bundle-rantamuta/tests/`.
- [x] Test ritual-state helper with all 8 combinations of placements.
- [x] Test ordered missing-step output determinism.
- [x] Test per-player gating (`introShown`, `completionShown`, `galleryRedirectShown`).
- [x] Test patrol route index progression and loop behavior.
- [x] Test “pause patrol when players present” branch.
- [x] Test missing target room branch (safe no-op).
- [x] Test cooldown gates prevent duplicate hint emission.

## Step 17: Manual QA Pass

- [x] Boot to codex area and confirm Tomo initially appears in `bell_courtyard`.
- [x] Walk route manually and observe patrol progression across:
- [x] courtyard -> nave -> stair -> nave -> courtyard
- [x] Complete puzzle in different ordering permutations; ensure hints remain correct.
- [x] Confirm no interference with:
- [x] `put` guards on ritual targets
- [x] crypt gate open logic
- [x] bell rope pull behavior
- [x] Confirm no regressions to observatory/gallery routes.
- [x] Confirm output readability with two simultaneous players in bell rooms.

## Step 18: Final Verification and Completion

- [x] `npm test` passes.
- [x] `npm run ci:local` passes (run from a clean tree or approved local strategy).
- [x] Diff review confirms only intended codex and test/doc changes.
- [x] Document any known limitations (for example, no `talk` command integration yet).
- [x] Mark checklist complete only when all above boxes are done.
