# Bundle Rantamuta Technical Manual

## Purpose

This document is a technical map of `bundles/bundle-rantamuta` for maintainers (human or agent) who need to understand how command execution, policy hooks, mutation, rendering, and area scripts work together in the current implementation.

This is an implementation manual, not a normative contract. Normative behavior lives in:

- `docs/normative/CommandArchitecture.md`
- `docs/normative/EntityResolution.md`
- `docs/normative/PredicateStateRendering.md`
- `docs/normative/SemanticMessaging.md`

Use this manual to answer "where does this happen in code?" and "what are the current extension points?".

## Audience and intent

This manual is written for maintainers who need to:

1. debug command pipeline behavior quickly,
2. add or migrate commands without breaking phase boundaries,
3. understand how area scripts currently attach policy/reaction behavior,
4. evaluate what should move into engine primitives.

## System boundaries

`ranviermud` has three layers relevant here:

1. Wrapper/runtime integration layer (repo root): bootstrapping, scenario runner, CI.
2. Bundle layer (`bundles/bundle-rantamuta`): command pipeline and reference gameplay behavior.
3. Engine layer (`ranvier` package): core entities/managers/events and transport abstractions.

This bundle intentionally avoids engine internal edits. Any behavior in this doc is bundle-owned unless explicitly marked as engine behavior.

## File map (bundle)

Primary runtime flow:

- `bundles/bundle-rantamuta/server-events/telnet.js`
- `bundles/bundle-rantamuta/server-events/virtual-door.js`
- `bundles/bundle-rantamuta/input-events/main.js`
- `bundles/bundle-rantamuta/lib/session/auth-flow.js`
- `bundles/bundle-rantamuta/lib/session/player-lifecycle.js`
- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`

Parsing and canonicalization:

- `bundles/bundle-rantamuta/lib/input-canonicalizer.js`
- `bundles/bundle-rantamuta/lib/parse-input.js`

Entity resolution:

- `bundles/bundle-rantamuta/lib/session/entity-resolution.js`
- `bundles/bundle-rantamuta/lib/helpers/entity-resolution-helper.js`

Mutation/commit:

- `bundles/bundle-rantamuta/lib/session/mutator.js`
- `bundles/bundle-rantamuta/lib/session/render-dispatch.js`
- `bundles/bundle-rantamuta/lib/session/semantic-message.js`
- `bundles/bundle-rantamuta/lib/doors/virtual-door-service.js`
- `bundles/bundle-rantamuta/lib/doors/door-command-helper.js`

Semantic messaging harness (tooling):

- `util/message.js`

Predicate benchmark harness (tooling):

- `bundles/bundle-rantamuta/tests/benchmarks/bench-all.js`
- `bundles/bundle-rantamuta/tests/benchmarks/bench-record.js`
- `bundles/bundle-rantamuta/tests/benchmarks/bench-check.js`
- `bundles/bundle-rantamuta/tests/benchmarks/predicate-baseline.json`

Room rendering:

- `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js`
- `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`

Area predicate registries:

- `bundles/bundle-rantamuta/areas/codex/predicates.js`
- `bundles/bundle-rantamuta/areas/test/predicates.js`

Reference commands:

- `bundles/bundle-rantamuta/commands/look.js`
- `bundles/bundle-rantamuta/commands/go.js`
- `bundles/bundle-rantamuta/commands/open.js`
- `bundles/bundle-rantamuta/commands/close.js`
- `bundles/bundle-rantamuta/commands/lock.js`
- `bundles/bundle-rantamuta/commands/unlock.js`
- `bundles/bundle-rantamuta/commands/take.js`
- `bundles/bundle-rantamuta/commands/put.js`
- `bundles/bundle-rantamuta/commands/pull.js`
- `bundles/bundle-rantamuta/commands/push.js`
- `bundles/bundle-rantamuta/commands/inventory.js`
- `bundles/bundle-rantamuta/commands/quit.js` (also fast-pathed in `input-events/main.js`)

Reference area scripts (Bell Tower):

- `bundles/bundle-rantamuta/areas/codex/scripts/items/ritualPutTarget.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/items/bronzeClapperGuard.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/items/waxSealGuard.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/items/prayerStoneGuard.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/rooms/bellCryptGate.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/helpers/putPolicy.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/helpers/exitGate.js`

## VirtualDoor service internals (current concrete layout)

Location and ownership:

1. Runtime authority implementation lives in `bundles/bundle-rantamuta/lib/doors/virtual-door-service.js`.
2. Lifecycle wiring lives in `bundles/bundle-rantamuta/server-events/virtual-door.js`.
3. Shared door-command helpers live in `bundles/bundle-rantamuta/lib/doors/door-command-helper.js`.

Registry and service object:

1. Module-local registry key: `serviceRegistry` (`WeakMap`, keyed by `state`).
2. Per-service indices:
   - `pairByEdgeKey` (directed edge key -> pair)
   - `pairByRoomRefs` (stable unordered room pair key -> pair)
3. Legacy-write routing state:
   - `patchedRoomMethods`
   - `warnedLegacyWrites`

Current helper/index naming in `virtual-door-service.js`:

1. Key helpers: `normalizeRef`, `edgeKey`, `pairKey`.
2. Scan/build helpers: `scanVirtualDoorPairs`, `resolvePairLockedBy`.
3. State helpers: `reconcilePairState`, `reflectPairState`, `applyDoorMutation`.
4. Validation helper export: `_validateVirtualDoorConfig`.

Naming stability note:

1. The concrete names above are current implementation choices, not cross-bundle compatibility contracts.
2. Behavior remains governed by `docs/normative/VirtualDoor.md`.

## End-to-end runtime flow

### 1) Socket input to session event

`server-events/telnet.js` creates a session object and routes incoming socket data to listeners in `InputEventManager.get('main')`.

Key points:

1. Session state machine starts at `getName`.
2. On `close`, player is saved and removed.
3. Transport details are isolated in `TelnetStream`.

### 2) Session event routing

`input-events/main.js` is the dispatch switch:

1. `getName` -> `handleGetName(...)`
2. `getPassword` -> `handleGetPassword(...)`
3. `inGame` -> `handleCommand(...)`

Important detail: for `inGame`, it awaits/returns `handleCommand(...)` so session input processing stays serialized.

### 3) Login and first room render

`auth-flow.js` validates/creates account, then calls `enterGame(state, session, io)`.

`player-lifecycle.js`:

1. loads or creates player,
2. hydrates player,
3. binds socket/session,
4. renders room view via `buildRoomViewLines(...)`,
5. prompts.

This is a non-command render path; it reuses the same room-view builder as `look`.

## Command pipeline implementation (bundle)

Pipeline orchestration lives in `lib/session/command-dispatch.js`.

### Phase 0: Receive input

1. Parse is done by `parseInput(input)`.
2. Canonicalization happens inside parse via `canonicalizeInput(raw)`.
3. Empty input short-circuits with prompt only.
4. Unknown intent/command sends `What?` and prompts.

Lookup behavior:

1. exact command/alias lookup via `CommandManager.get(...)` when available,
2. legacy `find(...)` path is guarded to avoid prefix ambiguity.

### Phase 1: Entity Resolution

`EntityResolution.resolveEntityContext(state, command, player, parsedInput)`:

1. reads `metadata.entityResolution.rules`,
2. selects rule by shape,
3. canonicalizes relation token (`relationTokenRaw` + `relationTokenCanonical`),
4. resolves direct/indirect targets via declared scope profile,
5. returns structured failure codes (no player output).

Supported resolver scopes today:

1. `player.inventory`
2. `room.items`
3. `room.details`
4. `room.exits`

Nested traversal:

1. opt-in per scope entry (`{ source, nested: true }`),
2. bounded breadth-first traversal with default max depth,
3. cycle protection and deterministic ranking.

### Phase 2: Capture (veto)

Capture has two sources:

1. `metadata.captureChecks` on command declarations.
2. shared entity policy evaluation (`canDirect` / `canIndirect` + `metadata.permissions`).

Policy order currently:

1. world (`state`)
2. quest system (`state.QuestFactory`)
3. area
4. room
5. player
6. indirect target
7. direct target

First deny wins.

`roomDetail` special-case:

1. `look` is allowed,
2. all non-look verbs are denied,
3. per-detail override message can be provided at `detail.verbs.<verbId>`.

### Phase 3: Target (command planner)

Command executes with context:

```js
{
  parsedInput,
  rawInput,
  entityResolution
}
```

Command must return envelope:

1. success: `{ ok: true, plan, render? }`
2. failure: `{ ok: false, error: { code, details?, message? } }`
3. or `undefined` for legacy behavior.

World mutation is not performed directly in command files.

### Phase 4: Bubble (reaction)

Bubble contributions are accumulated from:

1. command-level `metadata.reactions`,
2. each reaction function result in declaration order.

Contribution shape accepted:

1. `{ render: { messages: [...] } }`
2. arrays of contribution objects

`render.messages` normalization contract:

1. each message entry is either:
   - a string line, or
   - an instruction object (`broadcast`, `semanticEvent`, etc.)
2. this is the unified interface for lines and instructions.
3. runtime does **not** auto-normalize legacy `render.lines` / `render.instructions`; those shapes are treated as invalid payloads and ignored.

Bubble does not veto.

Important runtime guard:

1. bubble `operations` are forbidden,
2. dispatcher logs a contract error and ignores forbidden content,
3. command continues on the success path.

### Phase 5: Commit

`Mutator.applyMutationPlan(state, plan)` applies command target/base operations only.

Current instruction types:

1. `noop`
2. `transferItem`
3. `movePlayer`
4. `changeDoor`

`changeDoor` payload:

1. `type: 'changeDoor'`
2. `mutation: 'open' | 'close' | 'unlock' | 'unlockAndOpen' | 'closeAndLock'`
3. target by `direction` and/or `roomRef` (plus `actor` / `fromRoomRef` as needed)

Routing behavior:

1. mutator routes canonical door mutations through `getVirtualDoorService(state).mutateDoor(...)`,
2. unresolved targets warn and noop (idempotent no-op semantics preserved),
3. legacy instruction aliases are still accepted:
   - `openDoor` -> `changeDoor/open`
   - `closeAndLockDoor` -> `changeDoor/closeAndLock`

Atomicity model:

1. apply operations in order,
2. record undo handlers,
3. if one fails, rollback in reverse order,
4. rollback failures are logged with instruction context.

Invariant enforcement in mutator:

1. reversible endpoint checks (`addItem` + `removeItem`),
2. rejects `from === to`,
3. rejects moving item into itself,
4. rejects moving item into descendants (containment cycle guard).

### Phase 6: Render/Dispatch

1. Failure messages resolved by dispatcher (`command.metadata.errorMessages` then defaults).
2. Success render queue executes only after successful commit.
3. Queue order is deterministic: command success messages, then target-plan contributions, then bubble contributions.
4. Lines/instructions are both represented as `render.messages` entries and executed in queue order (best-effort, no rollback impact).
5. Prompt is emitted at end when player/socket is still active.

Current render delivery DSL (v1):

1. instruction types:
   - `broadcast`
   - `semanticEvent`
2. selector-based targeting only (no raw target object pointers in payload):
   - `targetSelector`: `currentPlayer | currentRoom | currentArea | roomByRef`
   - `exceptSelector`: `currentRoomTargets | targetsByRoomRef`
   - selector data fields: `targetRoomRef`, `exceptRoomRef` (when selector requires room reference)
3. audience kinds:
   - `player`
   - `room`
   - `area`
   - `areaExceptTargets`

Queue merge and execution order:

1. command success `render.messages` entries first,
2. target-plan contribution messages second (`planDirect` / `planIndirect`),
3. bubble contribution messages third (`metadata.reactions` order),
4. execute after successful commit.

`semanticEvent` runtime behavior (current implementation):

1. render is perspective-aware for `self`, `target`, and `other`.
2. actor display names are treated as proper names and capitalized.
3. target display names are kind-sensitive:
   - player/NPC shape (`isNpc` boolean) => capitalized proper name,
   - non-character/object targets => authored casing preserved.
4. pronouns currently supported in renderer: `he`, `she`, `it`.
5. renderer is pure text transformation; dispatch owns audience delivery.

## Internal trace and scenario diagnostics

`command-dispatch.js` currently does not emit an internal trace object.

Scenario runner mapping:

1. `util/scenario-runner.js` synthesizes stable `run` event JSON from parser output, exact command lookup, and observed execution.
2. JSON includes parse/lookup/phases/outcome.
3. non-JSON mode prints each raw command line followed by captured output lines.

Whitespace filtering:

1. JSON mode filters blank/ANSI-only lines by default.
2. `--whitespace` keeps them.

## Parse and canonicalization details

`lib/input-canonicalizer.js`:

1. deterministic ordered regex rewrite rules, first match wins.
2. examples:
   - `n` -> `go north`
   - `east` -> `go east`
   - `l` -> `look`
   - `x <thing>` -> `look <thing>`
   - `look at <thing>` -> `look <thing>`

`lib/parse-input.js`:

1. preserves `actorInput` (raw) and `canonicalInput` (rewritten),
2. normalizes recognized relation tokens,
3. outputs spans for direct/relation/indirect shapes.

## Command declaration model in practice

Each modern command uses metadata-driven declaration:

1. `metadata.entityResolution.rules` keyed by rule shape,
2. rule-local `acceptedRelations` for relation-bearing forms,
3. per-role scope profile under `scopeProfile`,
4. `metadata.errorMessages` for player text mapping.

Examples:

1. `look`:
   - intransitive + direct
   - direct scope: `room.items`, `room.details`, `player.inventory`
2. `go`:
   - direct only
   - direct scope: `room.exits`
   - command layer returns an empty base success envelope and delegates movement/door behavior to resolved exit hooks
   - fallback exit hook behavior:
     - no door or already-open door: enqueue `movePlayer`
     - closed+unlocked: enqueue `changeDoor/open` then `movePlayer`
     - locked+matching key: enqueue `changeDoor/unlockAndOpen` then `movePlayer`
     - locked+no matching key: deny with `GO_EXIT_LOCKED`
   - fallback composed door+movement messaging sets `suppressRoomBroadcast` on movement to avoid duplicate generic leave/arrive lines
   - authored exit `planDirect` can layer additional operations/render and may request `renderPolicy.replaceSuccess` to replace generic fallback success flavor
3. door commands (`open`/`close`/`lock`/`unlock`):
   - `open`, `lock`, `unlock` declare direct + directIndirect (`with`) rules with `allowUnresolvedIndirect: true`
   - direct scope: `room.exits`, `room.items`
   - indirect scope (when present): `player.inventory`
   - command-to-mutation mapping:
     - `open` -> `changeDoor/open`
     - `close` -> `changeDoor/close`
     - `lock` -> `changeDoor/closeAndLock`
     - `unlock` -> `changeDoor/unlock`
4. `put`:
   - direct and directIndirect
   - direct scope: `player.inventory`
   - indirect scope: `player.inventory`, `room.items`
   - success path contributes `render.messages` `semanticEvent` narration.
5. `take`:
   - direct only
   - scope includes nested room items and nested carried containers.
   - success path contributes `render.messages` `semanticEvent` narration.
6. `pull`/`push`:
   - direct only
   - direct scope: `room.items`
   - success path contributes `render.messages` `semanticEvent` narration (optionally overridden by target hook messages).

## Room details and inspectables

Room details are authored in YAML at `room.metadata.details` and resolved as lightweight candidates.

Canonical shape used by resolver helper:

```yml
metadata:
  details:
    - name: "bell-shrine"
      keywords: ["bell-shrine", "shrine", "bell"]
      description: "..."
      verbs:
        take: "..."
```

Key behavior:

1. details are resolvable in Entity Resolution when scope includes `room.details`.
2. `look` can inspect detail descriptions.
3. non-look actions are denied at capture with optional per-verb detail message.

## Stateful room rendering model

`room-view-helper.js` is the canonical room renderer used by:

1. intransitive `look`,
2. lifecycle arrival render on login/enter-game,
3. movement render on successful `go` flow (via exit plan contribution).

This render path is the normative method for state-dependent room description rendering (see `docs/normative/PredicateStateRendering.md`).

Composition order:

1. title
2. base/override description
3. matching description fragments
4. visible room item lines
5. exits line

State expression options:

1. `room.describeForLook(context)` override hook,
2. `metadata.descriptionVariants[]` first-match replacement,
3. `metadata.descriptionFragments[]` additive lines.
4. entries may gate on either:
   - `when: <predicate>` (predicate must evaluate true),
   - `whenNot: <predicate>` (predicate must evaluate false).

Predicate execution:

1. `evaluateRenderPredicate(...)` delegates to `PredicateRuntime.evaluate(...)` (world runtime if provided, helper default otherwise).
2. Runtime resolution is area-local through `areas/<area>/predicates.js`.
3. Predicates receive restricted input `({ actor, q, context })`, where `actor` is a normalized read-only view.
4. `q` is a read-only facade (`getRoomMetadata`, `getAreaMetadata`, `roomHasItem`, `currentContainerHasItem`, `roomContainerHasItem`, `actorHasItem`, `actorHasEffect`, `actorQuestActive`, `actorQuestCompleted`, `isDoorClosed`, `isDoorLocked`, `isDoorClosedBetween`, `isDoorLockedBetween`).
5. Predicate exceptions are swallowed and treated as `false` (fail-closed).
6. `room.renderPredicates` fallback is intentionally not used.

`q` query facade methods (current):

1. `q.getRoomMetadata(roomRef, key) -> *`
   Reads the resolved room `metadata.values` key-path value using case-insensitive segment matching.
   Returns `undefined` for missing paths.
2. `q.getAreaMetadata(areaRef, key) -> *`
   Reads the resolved area `metadata.values` key-path value using case-insensitive segment matching.
   Returns `undefined` for missing paths.
3. `q.roomHasItem(roomRef, itemRef) -> boolean`
   Returns `true` when any top-level item in that room matches `itemRef`.
4. `q.currentContainerHasItem(itemRef) -> boolean`
   Returns `true` when the current rendered container contains `itemRef`.
   Uses `renderContext.currentContainer` when provided; otherwise falls back to `renderContext.entity` when that entity has an inventory.
5. `q.roomContainerHasItem(roomRef, containerRef, itemRef) -> boolean`
   Returns `true` when any matching top-level container in the room contains `itemRef`.
6. `q.actorHasItem(itemRef) -> boolean`
   Returns `true` when the actor inventory contains `itemRef`.
   Returns `false` when actor context is missing.
7. `q.actorHasEffect(effectId) -> boolean`
   Returns `true` when the actor has an effect matching `effectId`.
   Returns `false` when actor context is missing.
8. `q.actorQuestActive(questRef) -> boolean`
   Returns `true` when `questRef` is present in actor active quests.
   Returns `false` when actor context is missing.
9. `q.actorQuestCompleted(questRef) -> boolean`
   Returns `true` when `questRef` is present in actor completed quests.
   Returns `false` when actor context is missing.
10. `q.isDoorClosed(direction) -> boolean`
   Returns `true` when the current room's directional edge resolves to a closed door state.
   For virtualized pairs, reads effective virtual-door state.
11. `q.isDoorLocked(direction) -> boolean`
   Returns `true` when the current room's directional edge resolves to a locked door state.
   For virtualized pairs, reads effective virtual-door state.
12. `q.isDoorClosedBetween(roomARef, roomBRef) -> boolean`
   Returns `true` when the resolved pair/edge is effectively closed.
   Does not require actor presence.
13. `q.isDoorLockedBetween(roomARef, roomBRef) -> boolean`
   Returns `true` when the resolved pair/edge is effectively locked.
   Does not require actor presence.

Reference behavior notes:

1. Refs are normalized for matching (case/whitespace tolerant).
2. Matching is authored-ref based (`entityReference`/authored refs), not runtime UUID based.
3. `q` exposes read-only checks only; no mutators are available.

Important implementation note:

1. Runtime input objects (`actor` view, `q`, and `context`) are frozen; predicate code only receives read-only helper surfaces.
2. Predicates still run as normal JS functions and are not sandboxed from global/environment reads; purity remains a behavioral contract.

## Area script model (current pattern)

Scripts in this bundle attach behavior in `listeners.spawn` (and some `ready`):

1. attach/override capture hooks (`canDirect` / `canIndirect`),
2. attach/override target-plan hooks (`planDirect` / `planIndirect`) where needed,
3. optionally wrap mutator-facing methods (`addItem`/`removeItem`) for local state sync,
4. in some scripts, wrap accessors (`getExits`) to ensure policy is attached consistently.

Bell Tower examples:

1. `ritualPutTarget.js`:
   - validates accepted offerings on indirect `put`,
   - contributes success flavor via `render.messages`,
   - enqueues ritual-completion render broadcasts when the final required offering is planned,
   - syncs item descriptions based on contained ritual item.
2. `bellCryptGate.js`:
   - attaches Bell Crypt gate policy and keeps runes detail text synchronized with basin contents,
   - gates `go down` using exit metadata requirements.
3. `areas/codex/predicates.js`:
   - defines area-local render predicates for slab/runes state (`is_slab_open`, `is_basin_runes_glowing`).
   - paired fallback lines are authored with `whenNot` in room metadata (for example slab-blocking and runes-dormant text).
   - for documentation examples, use snake_case yes/no names with `is_`, `can_`, or `does_` (for example `is_slab_open`, `can_descend`, `does_basin_contain_stone`).
4. `*Guard.js` item scripts:
   - prevent removing ritual items once placed.

## Data-driven policy in metadata

Shared capture helper supports `metadata.permissions` on entities (items, rooms, exits, etc.).

Common patterns:

1. boolean allow/deny,
2. string deny message,
3. role/relation-specific policy maps.

Exit example (`go` veto message):

```yml
exits:
  - direction: east
    roomId: test:gate
    metadata:
      permissions:
        verbs:
          go: "The portcullis is down."
```

## Testing map

Bundle tests:

1. `tests/command.dispatch.test.js`:
   - end-to-end phase behavior, veto ordering, bubble behavior, trace semantics.
2. `tests/entity.resolution.test.js`:
   - forms, scopes, relation normalization, nested traversal, ambiguity behavior.
3. `tests/mutator.test.js`:
   - instruction application, rollback, cycle/invariant guards.
4. `tests/room.view.*.test.js`:
   - baseline rendering and stateful predicate behavior.
5. command unit files (`*.command.test.js`):
   - per-command contract and failure surfaces.
6. scenario integration:
   - `tests/scenarios/scenario.basic.test.js`
   - `tests/scenarios/door-lock.scenario`
   - `tests/scenarios/virtual-door.scenario`
   - scenario script fixture: `tests/scenarios/bell-tower.scenario`
7. messaging and session flow:
   - `tests/semantic.message.test.js`
   - `tests/input.events.main.test.js`
   - `tests/auth.flow.test.js`
   - `tests/player.lifecycle.test.js`

Root-level tests also validate scenario runner behavior and wrapper boot behavior.

Performance guardrails:

1. `npm run bench:all`:
   - prints predicate/runtime, room-render, and scenario benchmark tables.
2. `npm run bench:record`:
   - refreshes `bundles/bundle-rantamuta/tests/benchmarks/predicate-baseline.json`.
3. `npm run bench:check`:
   - compares current numbers to baseline with friendly failure guidance.

## Known technical constraints and migration pressure points

These are not failures, but they are current architecture pressure points worth tracking:

1. Render predicates are fail-closed on exceptions, but there is no deep runtime mutation sandbox yet.
2. Some scripts still wrap entity mutator methods (`addItem`/`removeItem`) to synchronize derived state.
3. Script hook contracts are synchronous (`canDirect`, `canIndirect`, `planDirect`, `planIndirect`, `metadata.reactions`), no async policy surface.
4. Scenario-runner JSON is the stable diagnostics surface; dispatcher internals may evolve independently.

For core maintainers: these pressure points are the likely candidates for engine-level abstractions (`HookRunner`, query-pass caching, first-class mutation events).

## Hook surface (current)

Capture-phase surfaces:

1. command-level `metadata.captureChecks` (functions)
2. entity role hooks:
   - `canDirect(actor, verbId, context)`
   - `canIndirect(actor, verbId, relationTokenCanonical, context)`
3. entity declarative policy via `metadata.permissions`

Target-plan surfaces:

1. `directTarget.planDirect(actor, verbId, context)`
2. `indirectTarget.planIndirect(actor, verbId, relationTokenCanonical, context)`
3. may contribute plan operations and/or `render.messages` before commit

Bubble/reaction surfaces:

1. command-level `metadata.reactions` only
2. contributions are render-only (`render.messages`) and cannot enqueue mutations

## Metadata delete instruction semantics (D3)

Mutator-owned metadata delete ops:

1. `deleteRoomMetadata`
2. `deleteAreaMetadata`
3. `deleteWorldMetadata`

Behavior contract:

1. All deletes execute only in commit/mutator phase; render and predicate phases remain read-only.
2. Missing path delete is idempotent no-op with no warning and no thrown error.
3. Default delete is leaf-only; non-leaf/object/array delete throws unless `force: true`.
4. Deletes do not auto-prune empty parent/root objects.
5. Rollback restores deleted values using mutation undo closures.
6. World delete missing-root no-op must not create world metadata root.

## Change guidance for maintainers

When adding new behavior, preserve these guardrails:

1. Keep resolver read-only and output-free.
2. Keep command files planner-only (no direct world mutation).
3. Route world mutation through mutator instructions.
4. Keep failure message ownership in dispatch/metadata maps.
5. Keep lifecycle and command room rendering on the same room-view builder.
6. Prefer data declarations (`metadata.entityResolution.rules`, `metadata.permissions`) over ad hoc command parsing.

If you intentionally change one of these, update normative docs first (or in the same change set) and then update this manual.
