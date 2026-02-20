# Virtual Door

## Status

- Status: `normative-v1`
- Binding: Yes
- Scope: Virtual-door pairing, lifecycle ownership, mutation/query semantics, and door-command/movement policy
- Related:
  - [CommandArchitecture.md](CommandArchitecture.md)
  - [EntityResolution.md](EntityResolution.md)
  - [PredicateStateRendering.md](PredicateStateRendering.md)

## Purpose

Define the minimum enforceable contract for virtual-door behavior without requiring a first-class persisted Door entity.

## Scope

This document defines:

- virtual pairing eligibility
- bundle-side lifecycle ownership
- authoritative virtual-door state behavior
- mutation routing and state invariants
- door query semantics used by predicates/runtime checks
- command/movement door ergonomics contract

This document does not define:

- final prose/style polish for user-facing strings
- non-door movement systems
- first-class persisted Door entity model

## Non-Goals

- replacing core directional room-door storage
- introducing a required first-class Door resolver category in v1
- changing command phase ownership rules from `CommandArchitecture.md`

Spawn/egress note:

- Handling actors spawned into locked spaces is not a VirtualDoor responsibility.
- VirtualDoor provides consistent door state/query/mutation behavior only.
- Soft-lock/trap prevention and emergency egress policy belong to movement/lifecycle safety systems.

## Terms

- Directional door record: door state stored on destination room keyed by source room reference.
- Virtualized pair: two reciprocal directional door records treated as one logical doorway.
- VirtualDoor: runtime authority for a virtualized pair.
- Facade item: side-local item view bound via `virtualDoor: <itemId>`.

## Pairing Contract

### Authoring Field

`virtualDoor` is side-local door/exit config, not generic room metadata.

Allowed values:

- omitted: virtual pairing remains eligible
- `false`: side opts out of virtualization
- `<itemId>`: side remains virtual-eligible and binds side-local facade view

### Side-Bound Facade Views

When a pair is virtualized, both sides may bind different facade items while sharing one logical door state.

Rules:

- state authority remains VirtualDoor (`closed`, `locked`, `lockedBy`)
- side-local facade item controls interaction/presentation from that side
- facade-originated door-state mutations route to VirtualDoor authority

### Eligibility Rules

A pair is virtual-eligible only if all are true:

1. Room A has an exit to Room B.
2. Room B has an exit to Room A.
3. Room B has a door record keyed by `A`.
4. Room A has a door record keyed by `B`.
5. Room A has exactly one exit to Room B.
6. Room B has exactly one exit to Room A.

If either side sets `virtualDoor: false`, the pair must be non-virtual.

### `lockedBy` Resolution

For virtual-eligible pairs:

- if both sides define `lockedBy` and values match, use that key
- if only one side defines `lockedBy` and the other omits it, use the defined key
- if both sides define different `lockedBy`, disable virtualization for that pair and warn

### Determinism

- Pairing decisions are computed at load/reload time.
- Virtualization must not flip dynamically during normal runtime mutation.

## Lifecycle Ownership (Bundle-Side)

v1 VirtualDoor is bundle-owned runtime behavior.

Rules:

1. VirtualDoor initialization must be implemented in `bundle-rantamuta`, not core engine.
2. Bundle server-events must register startup/shutdown hooks for VirtualDoor service lifecycle.
3. Startup must call `ensureVirtualDoorService(state)` to prewarm service initialization; shutdown disposes service caches/indices.
4. Service access contract:
   - `getVirtualDoorService(state)` must return an initialized service.
   - if not yet initialized, `getVirtualDoorService(state)` must call idempotent `ensureVirtualDoorService(state)` internally.
   - command/query/mutator call sites should call `getVirtualDoorService(state)`, not `ensure...` directly.
5. No special scenario-runner bootstrap is required if door code paths consistently use `getVirtualDoorService(state)`.

6. Service instances must not be attached as ad hoc fields on `GameState`:

- use bundle-local module registry keyed by `state` (for example `WeakMap`) instead.

## State Authority and Mutation Routing

For a virtualized pair:

1. Door mutation instructions must route through VirtualDoor.
2. VirtualDoor computes one effective logical door state for the pair.
3. On successful commit, VirtualDoor must reflect that state to both directional door records.

Commit atomicity requirement:

- Reflection to both directional records is one logical mutator operation.
- Implementations may perform two underlying writes, but they must occur within one commit instruction boundary.
- If reflection cannot be completed, operation must fail as a unit and restore pre-operation door state for both directional records.

Load/reload reconciliation for paired directional records:

1. Normalize each directional side first:

- `aClosed = A.closed || A.locked`
- `bClosed = B.closed || B.locked`

2. Compute effective virtual state:

- `vDoor.closed = aClosed || bClosed`
- `vDoor.locked = A.locked || B.locked`

3. Persist/reflect that effective state to both directional records for the pair.

Direct mutation of backing directional records for a virtualized pair is out of contract.

Single write-path discipline:

- For virtualized pairs, command surfaces, mutator instructions, and scripted door-state changes must route through VirtualDoor service APIs.
- Calling legacy directional methods directly (`room.openDoor`, `room.closeDoor`, `room.lockDoor`, `room.unlockDoor`) for virtualized pairs is out of contract.
- Monkeypatching `Room` methods is not required in v1; preferred enforcement is centralized routing in bundle-owned code paths.

When a pair is non-virtualized:

- directional records remain independent side-local state
- directional asymmetry is permitted by design

Facade interaction contract:

1. Facade item plan hooks use `planDirect`/`planIndirect` naming.
2. Facade item `planDirect` may emit door mutation instructions.
3. If a virtualized pair exists for a targeted edge, door-state instructions must route to VirtualDoor authority.
4. Capture veto policy is conjunctive for door actions:

- `allow = facadeCanDirect && virtualDoorCanDirect`.
- Either layer may veto.

## Invariants and Mutation Semantics

Invariant:

- `locked => closed` must always hold.

Mutation instructions:

- `open` => `locked = false`, `closed = false`
- `close` => `closed = true` (locked unchanged)
- `unlock` => `locked = false` (closed unchanged)
- `unlockAndOpen` => `locked = false`, `closed = false`
- `closeAndLock` => `closed = true`, `locked = true`

Additional rules:

- idempotent operations must succeed as no-op
- unresolvable target must warn and noop
- key/permission validation occurs in capture/plan, not in mutation execution
- `unlockAndOpen` is a first-class instruction for ergonomics even though it is composable from two lower-level steps

## Query Semantics

Required query API surface:

- `q.isDoorClosed(direction)`
- `q.isDoorLocked(direction)`
- `q.isDoorClosedBetween(roomARef, roomBRef)`
- `q.isDoorLockedBetween(roomARef, roomBRef)`

Rules:

- Directional forms evaluate from the current bound room perspective.
- `Between(...)` forms do not require actor presence.
- For virtualized pairs, query results must come from VirtualDoor effective state.
- For non-virtual pairs, query results come from side-local directional records.
- Unresolvable query input returns `false` and may warn.
- Query surface is read-only; no mutation methods are exposed via `q`.

## Movement and Command Contract

Boundary:

- `go <direction>` remains exit-resolved.
- v1 does not require introducing first-class Door targets in global entity-resolution contracts.

### Auto Door Ergonomics for `go`

`go <direction>` door behavior:

1. No door on edge:

- normal movement.

1. Door already open:

- normal movement.

1. Door closed + unlocked:

- auto-apply `open`
- continue movement
- emit composed door+leave source semantic and door+enter destination semantic

1. Door locked + matching key available:

- auto-apply `unlockAndOpen`
- continue movement
- emit composed door+leave source semantic and door+enter destination semantic

1. Door locked + no matching key:

- movement denied in capture/plan failure path

### Explicit Door Commands

v1 command surface:

- `open <door>` (with optional key target)
- `close <door>`
- `lock <door>` (with optional key target)
- `unlock <door>` (with optional key target)

Command-to-mutation mapping:

- `open` command -> `open` mutation
- `close` command -> `close` mutation
- `lock` command -> `closeAndLock` mutation
- `unlock` command -> `unlock` mutation

### Key Validation Responsibility

- Key matching/permission checks occur in capture/plan.
- Mutation layer performs state transition only.
- Key matching is by key definition reference (`lockedBy` / item `entityReference`), not per-instance UUID.
- Multiple carried copies of the same matching key reference are valid and are not ambiguous.
- For `open`/`unlock`/`lock` commands with an explicit `with <key phrase>` target:
  - resolve candidate key items from actor inventory that match the phrase
  - filter candidates by `candidate.entityReference === lockedBy`
  - if one or more compatible candidates remain, proceed using a deterministic selected candidate for messaging
  - selection must follow resolver ordering/tie-break rules from `EntityResolution.md` (do not invent a door-local ordering rule)
  - when multiple compatible candidates remain, selected candidate affects display text only; lock compatibility result is the same
  - if none remain, fail with wrong-key capture messaging
  - do not fall back to other inventory keys outside the explicit phrase candidate set
- For `open`/`unlock`/`lock` commands with no explicit `with <key>` target, capture/plan may auto-select any carried item whose definition reference matches `lockedBy`.
- If no matching key reference exists, command should fail with capture-failure messaging.

## Messaging Contract (Default Behavior)

Defaults may be overridden by facade/surface-specific policy.

Cross-room rule:

- opposite-room lines are explicit cross-room delivery and are not semantic "others" scoped to actor room.

### Capture-Failure Defaults (Actor-Only)

- unlock without usable key: `{actor.You} cannot unlock the {object.direct}.`
- lock without usable key: `{actor.You} cannot lock the {object.direct}.`
- unlock/open with wrong key: `{actor.You} {verb:try} the {object.indirect}, but it does not fit the lock.`
- lock with wrong key: `{actor.You} {verb:try} to {verb:lock} the {object.direct} with the {object.indirect}, but it does not fit the lock.`
- open while locked: `{actor.You} cannot open the {object.direct}; it is locked.`
- when an explicit `with <key>` target is provided and incompatible, use wrong-key messaging instead of generic locked/no-key messaging
- no opposite-room line for these capture failures
- same-door facade policy may override these defaults

### Idempotent Defaults (Actor-Only)

- already open: `The {object.direct} is already open.`
- already closed: `The {object.direct} is already closed.`
- already locked: `The {object.direct} is already locked.`
- already unlocked: `The {object.direct} is already unlocked.`

### Success Defaults

- `go` auto `unlockAndOpen` emits:
  - source-room semantic: `{actor.You} {verb:unlock} the {object.direct} with the {object.indirect}, {verb:open} it, and {verb:leave}.`
  - fallback source semantic when key label is unavailable: `{actor.You} {verb:unlock} the {object.direct}, {verb:open} it, and {verb:leave}.`
  - destination-room line (opposite-room audience): `The {object.direct} {verb:open} and {actor.name} {verb:enter}.`
- `go` auto `open` emits:
  - source-room semantic: `{actor.You} {verb:open} the {object.direct} and {verb:leave}.`
  - destination-room line (opposite-room audience): `The {object.direct} {verb:open} and {actor.name} {verb:enter}.`
- `unlock <door>` command success:
  - actor semantic: `{actor.You} {verb:unlock} the {object.direct}.`
  - opposite-room broadcast: `The {object.direct} unlocks with a click.`
- `open <door>` command success:
  - actor semantic: `{actor.You} {verb:open} the {object.direct}.`
  - actor semantic when a key target is used to clear lock: `{actor.You} {verb:open} the {object.direct} with the {object.indirect}.`
  - opposite-room broadcast: `The {object.direct} opens.`
- `close <door>` command success:
  - actor semantic: `{actor.You} {verb:close} the {object.direct}.`
  - opposite-room broadcast: `The {object.direct} closes.`
- `lock <door>` command success:
  - actor semantic: `{actor.You} {verb:lock} the {object.direct}.`
  - actor semantic when key target is used: `{actor.You} {verb:lock} the {object.direct} with the {object.indirect}.`
  - opposite-room broadcast: `The {object.direct} locks with a click.`

### Door Name Fallback

- If facade display name is unavailable, default label is `{direction} door`.
- Opposite-room messaging uses opposite-direction viewpoint label.

### With-Actor vs Actorless Surface

- with actor: semantic actor/room/opposite-room messaging as configured
- without actor (lever/script/system): no actor semantic line; room/opposite-room delivery only when target room context exists

### Movement De-Dup

- When a composed door+movement success line is emitted for `go`, generic movement leave/arrive defaults for that same action must be suppressed.

## Validation Requirements

Validation should surface:

- reciprocal exits without reciprocal door records
- asymmetrical `virtualDoor: false` across a pair (informational)
- candidate pairs with multiple exits to same counterpart room (non-virtual, warn)
- virtual candidates with conflicting `lockedBy` (non-virtual, warn)
- virtual candidates bound to missing facade item id
- impossible authored load state (`locked: true` with `closed: false`) before normalization/reconciliation

Default mode should warn; strict validation mode may fail.

## Migration and Reversibility

Migration direction:

1. detect candidates from existing reciprocal directional door records
2. virtualize by default unless explicitly opted out
3. preserve directional records as compatibility/persistence backing

Reversibility requirements:

- no persisted virtual-door identity in v1
- no schema migration required for existing directional records
- single internal service boundary for virtual-door read/write
- deterministic pairing/conflict outcomes per load cycle

## Implementation Tracking (Temporary, Non-Normative)

This section records rollout sequencing and is temporary.

Phase summary:

1. service lifecycle wiring (bundle server-events + accessor-based auto-ensure)
2. pairing/authority/query implementation
3. mutation routing for `open`/`close`/`unlock`/`unlockAndOpen`/`closeAndLock`
4. `go` auto-door ergonomics and explicit door commands
5. test/content migration and documentation synchronization

Cross-doc updates required on landing:

- `docs/normative/CommandArchitecture.md`:
  - phase ownership for door command capture/plan/render and `go` auto-door behavior
  - composed-message movement de-dup behavior
- `docs/normative/EntityResolution.md`:
  - door target resolution shape for explicit door commands
  - fallback naming expectations for exit/door candidates
- `docs/normative/PredicateStateRendering.md`:
  - canonical door query methods in allowed `q` surface
- `docs/normative/SemanticMessaging.md` (if promoted):
  - ensure default door templates are valid and dispatchable
- `docs/BundleRantamutaTechnicalManual.md`:
  - concrete implementation map (service/init/query/mutator/commands/tests)
- `docs/DesignerManual.md`:
  - designer-facing guidance for door behavior, key expectations, and override points

## Open Questions (Non-Blocking)

The following threads remain intentionally unresolved in v1:

1. Whether VirtualDoor should emit dedicated lifecycle events beyond existing command/render surfaces.

2. Strict-validation ownership boundary for VirtualDoor validation failures (which strict mode/switch is authoritative).
