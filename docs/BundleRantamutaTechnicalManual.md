# Bundle Rantamuta Technical Manual

## Purpose

This document is a technical map of `bundles/bundle-rantamuta` for maintainers (human or agent) who need to understand how command execution, policy hooks, mutation, rendering, and area scripts work together in the current implementation.

This is an implementation manual, not a normative contract. Normative behavior lives in:

- `docs/normative/CommandArchitecture.md`
- `docs/normative/EntityResolution.md`

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

Room rendering:

- `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js`

Reference commands:

- `bundles/bundle-rantamuta/commands/look.js`
- `bundles/bundle-rantamuta/commands/go.js`
- `bundles/bundle-rantamuta/commands/take.js`
- `bundles/bundle-rantamuta/commands/put.js`
- `bundles/bundle-rantamuta/commands/inventory.js`

Reference area scripts (Bell Tower):

- `bundles/bundle-rantamuta/areas/rantamuta/scripts/items/ritualPutTarget.js`
- `bundles/bundle-rantamuta/areas/rantamuta/scripts/items/bronzeClapperGuard.js`
- `bundles/bundle-rantamuta/areas/rantamuta/scripts/items/waxSealGuard.js`
- `bundles/bundle-rantamuta/areas/rantamuta/scripts/items/prayerStoneGuard.js`
- `bundles/bundle-rantamuta/areas/rantamuta/scripts/rooms/bellCryptGate.js`
- `bundles/bundle-rantamuta/areas/rantamuta/scripts/helpers/putPolicy.js`
- `bundles/bundle-rantamuta/areas/rantamuta/scripts/helpers/exitGate.js`

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

Important detail: for `inGame`, it returns the value from `handleCommand`. Scenario tooling uses this for internal trace mapping.

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
2. shared entity policy evaluation (`allowAction` + `metadata.permissions`).

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
2. entity `bubbleEvent(action, context)` in order:
   - direct
   - indirect
   - player
   - room
   - area
   - quest system
   - world

Contribution shape accepted:

1. `{ operations: [...], render: { lines: [...] } }`
2. arrays of those
3. legacy single-operation object

Bubble does not veto.

### Phase 5: Commit

`Mutator.applyMutationPlan(state, mergedPlan)` applies base plan + bubble operations.

Current instruction types:

1. `noop`
2. `transferItem`
3. `movePlayer`

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
2. Success lines rendered only after successful commit.
3. Bubble-added render lines append after target render lines.
4. Prompt is emitted at end when player/socket is still active.

## Internal trace and scenario diagnostics

`command-dispatch.js` emits an internal unstable trace object (`CommandTraceInternal`).

Scenario runner mapping:

1. `util/scenario-runner.js` consumes traces and exports stable `run` event JSON.
2. JSON includes parse/lookup/phases/outcome.
3. non-JSON mode emulates player transcript style (`> <raw>` echoes and output).

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
3. `put`:
   - direct and directIndirect
   - direct scope: `player.inventory`
   - indirect scope: `player.inventory`, `room.items`
4. `take`:
   - direct only
   - scope includes nested room items and nested carried containers.

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
3. movement render (`go` success payload).

Composition order:

1. title
2. base/override description
3. matching description fragments
4. exits line
5. visible room item lines

State expression options:

1. `room.describeForLook(context)` override hook,
2. `metadata.descriptionVariants[]` first-match replacement,
3. `metadata.descriptionFragments[]` additive lines.

Predicate execution:

1. `evaluateRenderPredicate(...)` reads `room.renderPredicates[key]`.
2. Predicate functions receive the normalized render context directly.
3. The context object itself is shallow-frozen in `normalizeRenderContext(...)`.
4. Predicate exceptions are swallowed and treated as `false` (fail-closed).

Important implementation note:

1. The shallow freeze protects top-level context shape, but does not prevent mutation through nested object references (for example `context.room` internals).
2. Predicate purity is therefore currently a contract/convention, not a hard runtime sandbox.

## Area script model (current pattern)

Scripts in this bundle attach behavior in `listeners.spawn` (and some `ready`):

1. chain/compose with previous hooks if already present,
2. attach `allowAction` for capture policy,
3. attach `bubbleEvent` for bubble reactions,
4. optionally wrap mutator-facing methods (`addItem`/`removeItem`) for local state sync.

Bell Tower examples:

1. `ritualPutTarget.js`:
   - validates accepted offerings on indirect `put`,
   - contributes success flavor via bubble render lines,
   - syncs item descriptions based on contained ritual item.
2. `bellCryptGate.js`:
   - defines render predicates for slab/runes state,
   - gates `go down` using exit metadata requirements,
   - emits area/room broadcast messages when puzzle opens.
3. `*Guard.js` item scripts:
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
   - `tests/scenarios/scenario.bell-tower.test.js`
   - scenario script: `tests/scenarios/bell-tower.scenario`.

Root-level tests also validate scenario runner behavior and wrapper boot behavior.

## Known technical constraints and migration pressure points

These are not failures, but they are current architecture pressure points worth tracking:

1. Render predicates are fail-closed on exceptions, but there is no deep runtime mutation sandbox yet.
2. Some scripts still wrap entity mutator methods (`addItem`/`removeItem`) to synchronize derived state.
3. Script hook contracts are synchronous (`allowAction`, `bubbleEvent`), no async policy surface.
4. Internal command trace shape is intentionally unstable; only scenario-runner JSON is stable.

For core maintainers: these pressure points are the likely candidates for engine-level abstractions (`HookRunner`, query-pass caching, first-class mutation events).

## Change guidance for maintainers

When adding new behavior, preserve these guardrails:

1. Keep resolver read-only and output-free.
2. Keep command files planner-only (no direct world mutation).
3. Route world mutation through mutator instructions.
4. Keep failure message ownership in dispatch/metadata maps.
5. Keep lifecycle and command room rendering on the same room-view builder.
6. Prefer data declarations (`metadata.entityResolution.rules`, `metadata.permissions`) over ad hoc command parsing.

If you intentionally change one of these, update normative docs first (or in the same change set) and then update this manual.
