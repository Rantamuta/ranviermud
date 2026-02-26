# Area Shards (solo + party) as an engine-level feature

## Executive summary

Recommended first implementation:

- Add a new engine service, `ShardManager`, responsible for shard keying, area instance lifecycle, participant tracking, and cleanup.
- Keep current area entrypoints and export surface unchanged.
- Keep template area identity (`area.name`) stable for compatibility, but namespace **runtime room references** for shard instances (`<area>#<instanceId>:<roomId>`).
- Intercept only at existing movement choke points:
  - `Player#moveTo` for entry routing into sharded areas and participant accounting.
  - `PlayerManager#removePlayer` as a safety rail for disconnect cleanup.
- Provide deterministic lifecycle events for bundle-level narrative rehydration:
  - `ShardManager#shardCreated`
  - `ShardManager#playerEnterShard`
  - `ShardManager#playerLeaveShard`
  - `ShardManager#shardDestroyed`

This gives solo/party shards with minimal surface area changes, preserves existing room/command behavior for non-sharded areas, and keeps narrative state persistence outside shard runtime state.

---

## 1) Movement / transition interception: narrow choke point

### Candidate choke points considered

1. **Command pipeline (`go`, travel, recalls, scripts)**
   - Pros: explicit move intents.
   - Cons: too wide; travel originates from many bundle scripts and commands, violating minimal-impact goals.

2. **`RoomManager#getRoom` lookup layer**
   - Pros: central lookup API.
   - Cons: lookup currently has no actor context, so it cannot determine correct solo/party shard membership safely.

3. **`Player#moveTo(nextRoom)` (recommended)**
   - Pros: single engine path used after destination is resolved; has player context and target room context; already emits canonical leave/enter events.
   - Cons: NPC routing to shards needs explicit policy (first pass should keep NPCs non-participant unless summoned/created inside shard).

### Recommendation

Use `Player#moveTo` as the primary routing gate:

- If `nextRoom.area` is not sharded: preserve existing behavior.
- If `nextRoom.area` is sharded and player is transitioning from a different area instance/scope:
  1. Compute shard key (`solo`: player id, `party`: party id).
  2. Resolve/create shard instance from template area.
  3. Translate target room to same room id inside the resolved shard.
  4. Proceed with existing move semantics/events.

For robustness, also hook `PlayerManager#removePlayer` to force participant detachment in abnormal exit paths (disconnect/kick), ensuring shard teardown still occurs.

---

## 2) Area Instance representation options

### Option A — Full in-memory clone with remapped runtime refs (recommended)

**Shape**

- Clone area + rooms + default NPC/item hydration as already done for normal area hydration.
- Add shard runtime metadata: `templateAreaName`, `instanceId`, `shardKey`, `mode`.
- Rooms get instance-qualified runtime refs (`castle#p-123:4`).

**Impact**

- **Entity references**: deterministic, no collisions across shards.
- **Command/lookup**: existing `RoomManager.getRoom(ref)` still works with unique refs.
- **Managers/indices**: reuses existing managers, plus a shard index in `ShardManager`.
- **Memory**: highest among options; acceptable for MVP with immediate teardown on last participant.
- **Teardown**: straightforward explicit disposal pass per shard.

### Option B — Template + overlay (delta state only)

**Shape**

- Keep one immutable template area; shard stores only mutations (items removed, doors opened, NPC dead, etc.).

**Impact**

- **Entity references**: dual-resolution between template and overlay required.
- **Command/lookup**: substantial changes to room/item/npc fetch paths.
- **Managers/indices**: every manager needs shard-aware indirection.
- **Memory**: efficient for sparse mutation.
- **Teardown**: simpler data removal, but complexity shifted to runtime resolution logic.

### Option C — Copy-on-write entity graph

**Shape**

- Shared base object graph until mutation; mutated nodes fork per shard.

**Impact**

- **Entity references**: complex aliasing and ownership semantics.
- **Command/lookup**: broad engine changes.
- **Managers/indices**: pervasive identity bookkeeping.
- **Memory**: best potential efficiency, highest implementation risk.
- **Teardown**: intricate due to shared object lifetimes.

### Recommendation

Choose **Option A** for first pass. It matches existing hydration model, is easiest to reason about, and keeps change scope reviewable.

---

## 3) Namespacing and IDs

## Goals

- Allow concurrent instances of same template area.
- Avoid cross-instance resolution leakage.
- Preserve designer-facing refs/config.

### Proposed runtime reference model

- **Template ref (designer/static):** `castle:4`
- **Runtime shard ref (internal):** `castle#<instanceId>:4`

Where:

- `castle` remains `area.name` (compatibility with scripts/config assumptions).
- `<instanceId>` is opaque engine-generated token (e.g., `s-<playerIdHash>` or `p-<partyId>`).

### Mapping location

`ShardManager` owns:

- `Map<templateAreaName, Map<shardKey, AreaInstance>>`
- `Map<instanceId, AreaInstance>`
- `Map<playerName, instanceId>` participant index

Each `AreaInstance` owns:

- `templateAreaName`
- `instanceId`
- `runtimeAreaRefPrefix` (`castle#abc123`)
- `roomsByTemplateRoomId`

### Leakage prevention

- Only shard rooms are inserted into `RoomManager` under instance-qualified refs.
- Cross-room links/exits inside shard always resolve to same instance via rewritten `roomId` refs during hydrate/clone.
- Door maps must also be rewritten during clone/hydrate: `Room.doors` is keyed by exact `fromRoom.entityReference`, so keys like `castle:4` must become `castle#<instanceId>:4` for shard instances.
- No fallback from shard lookup to shared template refs once attached.

### Save/load reference policy (critical for disconnect/login)

To avoid persisting dead shard instance ids:

- **Do not persist `area#<instanceId>:roomId`** on the character record.
- Persist canonical template room reference only (`area:roomId`) plus optional shard affinity metadata (`mode`, `lastPartyId` if needed).

On login/hydration, if the saved room belongs to a sharded template area:

1. Resolve shard key from current player context (`solo`) or current party context (`party`).
2. `ShardManager.getOrCreateInstance(...)` for that key.
3. Place player into the equivalent room id in the new/resolved instance.

If party mode cannot resolve a valid party context at login, use explicit deterministic fallback policy (recommended: place player in a configured safe non-sharded room and require regrouping before re-entry).

---

## 4) Participant binding and lifecycle

### Shard key derivation

- `solo`: `shardKey = player.id` (or stable unique player key; if only name exists, canonical lowercase name is acceptable for MVP)
- `party`: `shardKey = party.id`

### Party identity caveat

`Party` currently has no explicit id. Minimal path:

- Add engine-generated `party.id` on creation in `PartyManager#create` (UUID/random token).
- Do not expose this as gameplay data; it is only runtime shard keying.

### Attach and route

On attempted entry to sharded template area:

1. Compute shard key from player + mode.
2. `ShardManager.getOrCreateInstance(templateArea, shardKey, context)`.
3. Translate destination template room id to instance room.
4. Move player into instance room.
5. Register participant (`player -> instanceId`).

### Staying in-shard across internal moves

Once player is inside shard, exit refs are already instance-qualified, so normal movement keeps them in the same shard naturally.

### Last-participant-left detection

Trigger `ShardManager.onPlayerRoomChange(player, prevRoom, nextRoom)` from move flow:

- If `prevRoom` belonged to instance A and `nextRoom` is outside A, decrement participant count for A.
- If count reaches zero: destroy shard A.

Also call detachment from:

- `PlayerManager#removePlayer` (disconnect/prune)
- Any forced relocation helper that bypasses standard move callback (if present in bundles, provide a utility API and document use)

### Disconnect + reconnect behavior

- Disconnect while inside a shard should count as leaving for participant tracking.
- If this disconnect causes participant count to hit zero, shard is torn down immediately.
- Reconnect should never rely on prior instance id resurrection; it should re-enter via normal shard resolution from saved canonical room + current key context.

This keeps lifecycle deterministic and prevents stale saved room references from pinning or reviving leaked instances.

### Teardown contract

`ShardManager.destroyInstance(instanceId)` should:

- Remove all shard rooms from `RoomManager`.
- Remove shard area from internal shard indices.
- Remove spawned shard NPCs via `MobManager.removeMob`.
- Remove spawned shard items via `ItemManager.remove`.
- Detach any shard-scoped listeners/event managers.
- Clear participant mapping entries.
- Emit `shardDestroyed`.

This keeps objects unreachable and GC-eligible.

---

## 5) Rehydration hooks for narrative FSM

We should not build narrative persistence in first pass, but sharding must expose deterministic hooks.

### Proposed events

Emit from `ShardManager`:

1. `shardCreated(areaInstance, context)`
   - Fired exactly once per new shard instance after hydrate, before first player enter event.
   - Use for applying deterministic world state based on narrative state.

2. `playerEnterShard(player, areaInstance, context)`
   - Fired each time a player enters/attaches to shard.

3. `playerLeaveShard(player, areaInstance, context)`
   - Fired on detach/exit/disconnect.

4. `shardDestroyed(areaInstance, context)`
   - Fired during teardown.

### Context contract

`context` should include:

- `templateAreaName`
- `instanceId`
- `shardKey`
- `mode` (`solo` | `party`)
- `playerName` (where applicable)
- `partyId` (when applicable)
- `trigger` (`enter`, `disconnect`, `teleport`, etc.)

No default player-visible output in these hooks.

---

## 6) Persistence strategy (optional, deferred)

### First pass policy

- **Do not persist shard runtime state.**
- Persist only narrative/progression state on character/party records.
- Rebuild shard state on entry through rehydration hooks.

### Future-safe interface (without implementing now)

Define optional extension points only:

- `ShardManager.serializeInstance(instance)` (default no-op/unsupported)
- `ShardManager.restoreInstance(snapshot)` (default unsupported)

This reserves an upgrade path without committing current implementation to shard-state storage.

---

## Touched engine subsystems / likely files

Minimal path touches:

- `src/Area.js`
  - carry `manifest.shard` and runtime instance metadata.
- `src/Room.js`
  - support runtime entity reference prefixing for shard instances.
- `src/Player.js`
  - movement routing hook into `ShardManager`.
- `src/PlayerManager.js`
  - disconnect/prune detach safety call.
- `src/Party.js` / `src/PartyManager.js`
  - runtime `party.id` for stable shard keying.
- `src/GameServer.js` (or game state bootstrap wiring location)
  - construct/register `ShardManager` and event bridge.
- New `src/ShardManager.js`
  - shard keying, lifecycle, indexes, events, teardown.
- Corresponding `types/*.d.ts` additions/updates.

No changes to `index.js` export strategy.

---

## Minimal phased change plan

### Phase 0: Safety rails (tests first)

Add deterministic tests before feature merge:

- GameServer lifecycle/event smoke around new manager wiring.
- BundleManager load semantics: area manifest accepts optional `shard.mode` and remains backward compatible.
- CommandManager load/dispatch unaffected by sharding additions.

### Phase 1: Manifest + manager scaffolding

- Parse/store optional `manifest.shard.mode` (`solo|party`).
- Add `ShardManager` with no routing yet.
- Add unit tests for shard keying and create/get semantics.

### Phase 2: Movement routing + namespaced refs

- Implement entry routing in `Player#moveTo`.
- Implement runtime room ref namespacing and in-shard exit resolution.
- Add tests proving two solo entrants do not share shard state.

### Phase 3: Party mode + teardown robustness

- Add `party.id` and party-keyed shard attach.
- Add last-participant teardown from move and disconnect paths.
- Add tests for party shared visibility and teardown correctness.

### Phase 4: Rehydration events

- Emit `shardCreated` and `playerEnterShard` with deterministic ordering.
- Add tests asserting event sequence and payload shape.

Keep each phase in separate small commits.

---

## Risks and mitigations

1. **Reference compatibility risk**
   - Risk: existing scripts assume `room.entityReference === "area:room"`.
   - Mitigation: keep `area.name` unchanged; only runtime refs are namespaced; expose helper for template ref retrieval if needed.

2. **Party key instability risk**
   - Risk: no party id today.
   - Mitigation: add opaque runtime `party.id` at creation; avoid leader-name-derived keys.

3. **Leak/cleanup risk**
   - Risk: shard instances survive disconnect paths.
   - Mitigation: dual cleanup hooks (`moveTo` + `removePlayer`) and explicit teardown routine tests.

4. **Cross-instance contamination risk**
   - Risk: wrong room lookup or exit points to shared template room.
   - Mitigation: rewrite all in-instance exit refs during clone/hydrate and test hard for no shared visibility between solo shards.

5. **Door enforcement regression risk in shards**
   - Risk: `Room.doors` keys remain template refs (`area:room`) while runtime movement uses namespaced refs (`area#instance:room`), causing `hasDoor/getDoor` checks to miss and silently bypass lock/closed enforcement.
   - Mitigation: rewrite door-map keys alongside exits during instance materialization and add targeted lock/closed door behavior tests in sharded instances.

---

## Required tests for first implementation

At minimum:

1. **Solo isolation**
   - Two players enter same solo-sharded template area.
   - Assert different instance ids, no shared room/player visibility, independent mutable room state.

2. **Party sharing**
   - Two party members enter party-sharded area.
   - Assert same instance id and mutual visibility.

3. **Lifecycle teardown**
   - Last participant leaves (normal move).
   - Assert shard removed from shard index + room index.

4. **Disconnect teardown**
   - Participant disconnects while alone in shard.
   - Assert teardown occurs.

5. **Reconnect from sharded saved room**
   - Persist player while they are in a sharded template room.
   - Assert saved room reference is canonical (`area:room`) not instance-qualified.
   - On next hydrate/login, assert engine resolves/creates the correct shard and places player in same template room id within that instance.

6. **Deterministic rehydration hooks**
   - Assert `shardCreated` fires before first `playerEnterShard` for new shard.

7. **Sharded door semantics parity**
   - In a sharded area with locked/closed doors, assert movement checks still enforce lock/closed state exactly as template area behavior.
   - Assert both explicit exits and inferred/door-guarded transitions respect rewritten door keys.

8. **Regression smoke for non-sharded areas**
   - Existing movement into normal areas unchanged.

---

## Alternative approach rejected for first pass

Rejected: template+overlay (delta state) as initial implementation.

Why rejected now:

- Requires broad cross-cutting changes to all entity lookup and mutation paths.
- Harder to validate incrementally.
- Adds implicit complexity before proving baseline shard routing semantics.

When to revisit:

- Only after functional correctness and lifecycle behavior are stable in production and memory pressure data indicates full clone cost is problematic.
