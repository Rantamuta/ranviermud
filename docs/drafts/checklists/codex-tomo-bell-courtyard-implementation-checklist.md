# Codex Tomo (Bell Courtyard) Implementation Checklist

## Goal Lock (do not drift)

- [ ] Tomo starts in `codex:bell_courtyard`.
- [ ] Tomo acts as a ritual caretaker for the Bell Tower path only.
- [ ] Tomo gives early framing when players first meet him in the bell route.
- [ ] Tomo gives progress-sensitive nudges for 0/1/2 completed ritual placements.
- [ ] Tomo gives a completion redirect toward the crypt descent when all 3 placements are done.
- [ ] Tomo later redirects players toward gallery/shard resonance.
- [ ] Tomo slowly patrols only between:
- [ ] `codex:bell_courtyard`
- [ ] `codex:bell_nave`
- [ ] `codex:bell_stair`

## Scope and Constraints

- [ ] Keep this implementation codex-only (all refs begin with `codex:`).
- [ ] Do not add dependence on any other area.
- [ ] Do not require a `talk` command (current play commands do not include it).
- [ ] Do not block or mutate existing puzzle mechanics.
- [ ] Do not move Tomo into puzzle-critical rooms (`codex:bell_belfry`, `codex:bell_crypt`, `codex:resonance_chamber`).
- [ ] Keep patrol/hint logic bounded and deterministic.

## File-Level Change Plan

- [ ] Create `bundles/bundle-rantamuta/areas/codex/npcs.yml`.
- [ ] Create `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`.
- [ ] Optionally create `bundles/bundle-rantamuta/areas/codex/scripts/helpers/ritualState.js` for shared ritual-state checks.
- [ ] Update `bundles/bundle-rantamuta/areas/codex/rooms.yml` to spawn Tomo in `bell_courtyard`.
- [ ] Add/extend scenario coverage in `bundles/bundle-rantamuta/tests/scenarios/`.
- [ ] Add automated behavior tests in `bundles/bundle-rantamuta/tests/` (unit/integration where feasible).

## Step 1: Author Tomo NPC Data (`npcs.yml`)

- [ ] Define a new NPC id: `tomo`.
- [ ] Set `name` to a stable authored label (example: `Bell Keeper Tomo`).
- [ ] Define `keywords` for reliable targeting (`tomo`, `keeper`, `bell`, `caretaker`).
- [ ] Add concise `description` matching codex bell-tone lore.
- [ ] Set `script: tomoCaretaker`.
- [ ] Add `metadata.tomo` config block for data-driven behavior (route, timings, copy).
- [ ] Keep ids/refs lowercase and normalized.
- [ ] Ensure entity ref resolves as `codex:tomo`.

## Step 2: Spawn Tomo in Bell Courtyard (`rooms.yml`)

- [ ] Edit `codex:bell_courtyard` room entry.
- [ ] Add `npcs:` field if not present.
- [ ] Add `codex:tomo` to that room’s NPC spawn list.
- [ ] Keep existing room items/exits unchanged.
- [ ] Confirm YAML shape matches loader expectations used elsewhere in this repo.

## Step 3: Define Tomo Runtime Contract (before coding)

- [ ] Define patrol route as ordered room refs:
- [ ] `codex:bell_courtyard`
- [ ] `codex:bell_nave`
- [ ] `codex:bell_stair`
- [ ] `codex:bell_nave`
- [ ] Define patrol cadence (example: every 25-40s).
- [ ] Define patrol pause behavior while players are present in Tomo’s room.
- [ ] Define per-player hint cooldown (example: 60-120s).
- [ ] Define one-time per-player intro gate.
- [ ] Define one-time per-player completion gate.
- [ ] Define optional post-completion reminder cooldown.

## Step 4: Implement Ritual Progress Computation

- [ ] In code, compute ritual completion from the exact required placements:
- [ ] `codex:crackedBell` contains `codex:bronzeClapper`
- [ ] `codex:reliquary` contains `codex:waxSeal`
- [ ] `codex:stoneBasin` contains `codex:prayerStone`
- [ ] Reuse existing helper approach for safe ref normalization.
- [ ] Keep result deterministic:
- [ ] `completedCount` (0..3)
- [ ] ordered `missingSteps[]`
- [ ] `isComplete` boolean
- [ ] Keep ordering stable for hints (recommended order):
- [ ] reliquary/wax seal
- [ ] basin/prayer stone
- [ ] cracked bell/bronze clapper
- [ ] Ensure function is read-only (no state mutation).

## Step 5: Implement Tomo Script Skeleton (`tomoCaretaker.js`)

- [ ] Export `module.exports = { listeners: { ... } }`.
- [ ] Implement `spawn` listener to initialize Tomo-local state:
- [ ] patrol route array
- [ ] current route index
- [ ] timestamps: `lastMoveAt`, `lastAmbientAt`
- [ ] per-player memory map (or player metadata key namespace)
- [ ] Implement `updateTick` listener for patrol + fallback hint pulses.
- [ ] Implement `enterRoom` listener for arrival flavor (optional).
- [ ] Implement `playerEnter` listener if proxied room events are available to NPCs in this runtime.
- [ ] If `playerEnter` proxy is unavailable, keep equivalent logic inside `updateTick`.

## Step 6: Implement Player Memory Model

- [ ] Choose one memory storage strategy and keep it consistent:
- [ ] Tomo-local in-memory map keyed by `player.uuid`, or
- [ ] `player.metadata.codex.tomo` object
- [ ] Track these flags/timestamps per player:
- [ ] `introShown`
- [ ] `completionShown`
- [ ] `galleryRedirectShown`
- [ ] `lastHintAt`
- [ ] Keep keys namespaced under `codex/tomo` to avoid collisions.
- [ ] Guard for missing metadata objects before read/write.

## Step 7: Implement Intro Behavior (early framing)

- [ ] Trigger intro when player first encounters Tomo in the bell patrol rooms.
- [ ] Intro line must frame the three-offering ritual clearly.
- [ ] Intro must not repeat for the same player.
- [ ] Intro should avoid spoilers about exact item locations unless desired.
- [ ] Intro should be delivered to room audience or player-only per desired tone.
- [ ] Keep intro emission path consistent with existing message delivery patterns.

## Step 8: Implement Progress-Sensitive Hints (0/1/2 complete)

- [ ] On eligible interaction (player enters room with Tomo, or periodic proximity check), compute ritual state.
- [ ] If `completedCount === 0`, emit broad framing hint.
- [ ] If `completedCount === 1`, emit hint mentioning two remaining offerings.
- [ ] If `completedCount === 2`, emit targeted hint for final missing placement.
- [ ] Honor per-player cooldown before emitting any hint.
- [ ] Avoid duplicate same-line spam when player idles in-room.
- [ ] Keep message selection deterministic from `missingSteps`.

## Step 9: Implement Completion Beat

- [ ] Detect transition to `isComplete === true`.
- [ ] On first complete-state encounter per player, emit completion redirect:
- [ ] direct player toward crypt descent (`down` from `codex:bell_crypt`).
- [ ] Mark `completionShown` so this beat is one-time per player.
- [ ] Add optional lower-frequency repeat reminder after long cooldown.

## Step 10: Implement Later Gallery/Shard Redirect

- [ ] Define condition for “later” redirect:
- [ ] recommended: ritual complete and player now has/has seen `codex:resonantShard`.
- [ ] When condition is met and not yet shown, emit gallery redirect line:
- [ ] point to mirrors east of square (`codex:perception_gallery`).
- [ ] Mark `galleryRedirectShown` to avoid repetition.
- [ ] Ensure this line does not fire before ritual completion.

## Step 11: Implement Patrol Behavior

- [ ] Patrol only on `updateTick` interval gate.
- [ ] Skip patrol move if current room has players (keep Tomo present while interacting).
- [ ] Resolve next room ref via `state.RoomManager.getRoom(...)`.
- [ ] If target room missing, skip safely and log once (no crash).
- [ ] Call `this.moveTo(nextRoom)` to perform movement.
- [ ] Advance route index only after successful move.
- [ ] Keep route looping indefinitely.
- [ ] Keep movement bounded; one room per patrol interval max.

## Step 12: Add Ambient Patrol Flavor (optional but recommended)

- [ ] On departure or arrival, emit short in-character room flavor.
- [ ] Keep lines short and low-frequency.
- [ ] Do not emit flavor every tick.
- [ ] Ensure ambient lines do not drown command feedback.

## Step 13: Safety and Edge Cases

- [ ] Handle missing `state`, `RoomManager`, or malformed metadata defensively.
- [ ] Handle missing player `uuid` by fallback key strategy.
- [ ] Handle player disconnect/reconnect without resetting one-time beats unexpectedly.
- [ ] Handle multiple players in room without per-tick fanout spam.
- [ ] Ensure Tomo script does not throw if any referenced item/container is absent.
- [ ] Ensure Tomo remains non-blocking if puzzle state is partially broken.

## Step 14: Codex Consistency Cleanup (recommended)

- [ ] Verify codex predicate area flag references use `codex` area id consistently.
- [ ] Fix any remaining stale area-id literals that could conflict with codex-only behavior.
- [ ] Re-run gallery look flow after any predicate-id cleanup.

## Step 15: Scenario Test Coverage

- [ ] Add scenario: `bundles/bundle-rantamuta/tests/scenarios/tomo-bell-courtyard.scenario`.
- [ ] Include path where player first meets Tomo in `codex:bell_courtyard`.
- [ ] Assert intro line appears once.
- [ ] Assert hint evolves after first placement.
- [ ] Assert hint evolves after second placement.
- [ ] Assert completion redirect appears after third placement.
- [ ] Assert gallery redirect appears after acquiring `codex:resonantShard`.
- [ ] Assert patrol presence changes room over time (or via deterministic tick advancement if harness supports it).
- [ ] Assert no spam: repeated `look` does not reprint one-time lines.

## Step 16: Unit/Integration Tests (JS)

- [ ] Add test file for Tomo script behavior under `bundles/bundle-rantamuta/tests/`.
- [ ] Test ritual-state helper with all 8 combinations of placements.
- [ ] Test ordered missing-step output determinism.
- [ ] Test per-player gating (`introShown`, `completionShown`, `galleryRedirectShown`).
- [ ] Test patrol route index progression and loop behavior.
- [ ] Test “pause patrol when players present” branch.
- [ ] Test missing target room branch (safe no-op).
- [ ] Test cooldown gates prevent duplicate hint emission.

## Step 17: Manual QA Pass

- [ ] Boot to codex area and confirm Tomo initially appears in `bell_courtyard`.
- [ ] Walk route manually and observe patrol progression across:
- [ ] courtyard -> nave -> stair -> nave -> courtyard
- [ ] Complete puzzle in different ordering permutations; ensure hints remain correct.
- [ ] Confirm no interference with:
- [ ] `put` guards on ritual targets
- [ ] crypt gate open logic
- [ ] bell rope pull behavior
- [ ] Confirm no regressions to observatory/gallery routes.
- [ ] Confirm output readability with two simultaneous players in bell rooms.

## Step 18: Final Verification and Completion

- [ ] `npm test` passes.
- [ ] `npm run ci:local` passes (run from a clean tree or approved local strategy).
- [ ] Diff review confirms only intended codex and test/doc changes.
- [ ] Document any known limitations (for example, no `talk` command integration yet).
- [ ] Mark checklist complete only when all above boxes are done.
