# Virtual Door Overlay Spec (Draft)

## Status

- Status: Draft
- Scope: Core-compatible door ergonomics layer for authored content
- Audience: Engine maintainers, bundle maintainers, non-engine content teams

---

## Executive Summary

This proposal introduces a **Virtual Door overlay** to solve a long-standing authoring and behavior problem:

- Core stores door state as directional edge records on destination rooms.
- There is no first-class Door entity.
- Designers regularly think in terms of one physical doorway with one state.

Result:

- Door state can silently drift between two sides.
- Message behavior must be hand-written repeatedly.
- Key/lock policy is fragmented.
- “Simple” door content requires extensive custom glue.

The overlay keeps core storage unchanged while offering a unified conceptual model:

- Build one virtual door when both sides are configured as a door pair.
- Track one shared state by default.
- Allow opt-out per side via `virtualDoor: false`.
- Allow side-specific interaction/presentation binding via `virtualDoor: <itemId>`.

This gives better authoring ergonomics without forcing an engine-wide first-class Door migration immediately.

---

## Problem Statement

### 1) Current Core Door Model Is Technically Valid but Authoring-Hostile

Core door state today is represented by per-room door records keyed by source room reference on the destination room.

That model is compact and flexible, but it encodes “door as directed edge” rather than “door as physical passage.”

Designers naturally author:

- “this doorway between room A and room B”

Core requires thinking as:

- “entry from A into B has one record”
- “entry from B into A has another record”

This mismatch is the root cause of most door bugs and confusion.

### 2) State Misalignment Is Easy

If both directions are configured independently, the following can drift:

- `closed`
- `locked`
- `lockedBy`

This can create valid but unintended world states:

- one side open, other side locked
- one side key-gated, other side free
- one side appears locked in text, opposite side behaves as open

### 3) Messaging Burden Is Repeated Everywhere

For each interaction (open/close/lock/unlock), authors must manually coordinate:

- actor-facing message
- local room message
- opposite room message
- side naming (“north door” vs “south door”)

Because there is no first-class door interaction surface, this is often solved with ad hoc scripts.

### 4) Key Semantics Are Stored but Not Enforced Centrally

Core can preserve fields like `lockedBy` in door records, but enforcement and behavior policy is left to higher-level logic.

This means keys are often:

- inconsistently validated
- enforced by some commands but not others
- missing from fallback/scripted mutation paths

### 5) Operational Cost

Teams end up doing repeated back-bending:

- synchronizing two directional states manually
- inventing local conventions per area
- writing room-specific scripts for common actions
- debugging perceived “door bugs” that are actually model mismatches

This is expensive and avoidable.

---

## Goals

- Provide a “one doorway” authoring model on top of existing core room-door storage.
- Default to synchronized two-sided state when a paired doorway exists.
- Preserve escape hatches for nonstandard content.
- Allow side-specific presentation and targeting.
- Keep compatibility with existing door data and movement rules.
- Reduce script boilerplate for common door interactions.

## Non-Goals

- Replacing core room door storage in this phase.
- Introducing a hard engine-level first-class `Door` entity in this phase.
- Removing directional door behavior from the engine.

---

## Proposed Model

### Virtual Door (Overlay Entity)

A **Virtual Door** is a runtime overlay object created when two door edges form a reciprocal pair.

A virtual door is:

- not a new persisted core entity type
- a runtime authority for shared state and policy
- backed by existing room-door records

### Door Views (Per-Side Interaction Surface)

Each side can expose either:

- a synthetic default door target, or
- a bound item target if configured

The view handles:

- room-local naming/keywords/description
- side-specific messaging phrasing
- command target ergonomics

The virtual door remains state authority.

---

## Authority Model (v1 Decision)

This draft explicitly chooses a **runtime object authority model** for virtualized pairs.

Each virtualized pair has an ephemeral runtime object:

- `closed`
- `locked`
- `lockedBy`

Directional room-door records remain persistence backing and compatibility surface.

Synchronization rules:

- On boot/reload pairing, virtual state is derived from directional records.
- During runtime mutation, writes occur through virtual authority first, then are mirrored to both directional records.
- External direct writes to directional records are considered out-of-contract in virtualized mode.

Rationale:

- Clear single authority for invariants.
- Cleaner promotion path to a true first-class Door later.
- Avoids repeated “which side is canonical?” ambiguity in computed-view approaches.

---

## Boot-Time Determinism

Virtualization decisions are deterministic at load time.

Rules:

- Pairing is computed at boot/reload only.
- Conflict outcomes are decided at boot/reload only.
- Virtualization does not “flip” dynamically during normal runtime mutation.

If content changes (hot reload / restart), pairing is recomputed from authored data.

This avoids runtime-adaptive behavior that is difficult to reason about and test.

---

## Pairing Rules

A virtual door candidate exists when all are true:

1. Room A has an exit to Room B.
2. Room B has an exit to Room A.
3. Room B has a door record keyed by `A`.
4. Room A has a door record keyed by `B`.
5. Room A has exactly one exit to Room B, and Room B has exactly one exit to Room A.

If either side explicitly sets `virtualDoor: false`, the pair is not virtualized.

If either room has multiple exits to the same counterpart room, the pair is non-virtual in v1.
This avoids ambiguous side mapping and keeps pairing deterministic.

---

## Authoring Field: `virtualDoor`

`virtualDoor` is a side-local authoring field on the exit edge (or equivalent side-local door config surface).

Allowed values:

1. `virtualDoor: false`

- Disable virtual pairing for this side.
- Directional records behave as raw core door edges.

1. `virtualDoor: <itemId>`

- Keep virtual pairing enabled.
- Bind this side’s door view to the item.
- If item missing at runtime, fallback to synthetic view and warn.

1. `virtualDoor` omitted

- Keep virtual pairing enabled.
- Use synthetic door view defaults.

This yields a simple tri-state API with one field.

---

### Side-Bound Item Views (Explicit Example)

If both sides bind `virtualDoor` to an item id, each side gets its own interface item while sharing one door state.

Example (conceptual):

- A-side config: `virtualDoor: itemA`
- B-side config: `virtualDoor: itemB`

Behavior:

- VirtualDoor remains the single authority for `closed` / `locked` / `lockedBy`.
- `itemA` is the interaction/presentation surface from room A.
- `itemB` is the interaction/presentation surface from room B.
- Mutations invoked through either item delegate to the same VirtualDoor authority.
- Side-specific naming/description/messages can differ by bound item without splitting door state.

This model intentionally separates:

- state authority (VirtualDoor), and
- side-local interface (bound item or synthetic view).

---

## State Authority and Synchronization

When virtualized:

- one runtime state is authoritative for the passage
- mutations write through to both underlying directional door records

Load-time reconciliation (when paired directional records disagree):

- Normalize each side first:
  - `aClosed = A.closed || A.locked`
  - `bClosed = B.closed || B.locked`
- Compute virtual state:
  - `vDoor.closed = aClosed || bClosed`
  - `vDoor.locked = A.locked || B.locked`
- This preserves lock information and enforces `locked => closed` after reconciliation.

Invariants:

- `locked => closed`
- `open` and `unlockAndOpen` both clear lock and set open state (`closed = false`)

Invariant enforcement location:

- Invariants are enforced only in the VirtualDoor mutation API.
- Commands, plan builders, and message layers must not duplicate invariant logic.
- Mutator instructions targeting virtualized edges must delegate to VirtualDoor mutation methods.

When not virtualized (`virtualDoor: false` on either side):

- each directional record is independent
- authors own synchronization (or intentional asymmetry)

---

## `lockedBy` Policy

### Virtual Mode

Virtual mode expects a coherent key policy.

Recommended behavior:

- if both sides define `lockedBy` and values match, use that key
- likewise, if only one side defines `lockedBy` and the other omits it, still use that defined key
- if both sides define different `lockedBy`, disable virtualization for that pair and warn

Conflict handling timing:

- `lockedBy` mismatch is evaluated during boot/reload pairing.
- Result is deterministic for that load cycle.
- Pair remains non-virtual for that load cycle.

Reason:

- differing `lockedBy` implies directional key semantics
- directional key semantics conflict with a single shared key policy

### Non-Virtual Mode

Directional key semantics are allowed and explicit:

- `A.lockedBy` governs entry to A
- `B.lockedBy` governs entry to B

No additional hand-holding is required.

---

## Messaging Contract

Virtual door interactions should support both semantic and broadcast channels:

- actor/self semantic line
- local room broadcast
- opposite room broadcast

Integration rule:

- Semantic actor/target/others output should use semantic event instructions.
- Cross-room notification should use explicit broadcast instructions targeting the opposite room.
- Cross-room lines are not treated as semantic “others” scoped to the actor room.

Defaults should exist for `open`, `close`, `unlock`, `unlockAndOpen`, and `closeAndLock`.
Designers can override per door and per side.

Message sources (in precedence order):

1. side-local override (bound item/view config)
2. virtual door-level override
3. system default template

Recommended default actor semantic templates (non-`go` command forms):

- `open <door>`: `You {verb:open} the {object.direct}.`
- `unlock <door>`: `You {verb:unlock} the {object.direct}.`
- `unlockAndOpen` internal/planning use (when rendered as a single line when an actor auto-unlocks a door before opening it): `You {verb:unlock} the {object.direct} with the {object.indirect} and {verb:open} it.`

### Default Message Matrix (v1)

Capture-failure defaults (actor-only, no opposite-room line):

- `unlock <door>` with no usable key:
  - `{actor.You} cannot unlock the {object.direct}.`
- `lock <door>` with no usable key:
  - `{actor.You} cannot lock the {object.direct}.`
- `unlock/open <door> with <wrong key>`:
  - `{actor.You} {verb:try} the {object.indirect}, but it does not fit the lock.`
- `lock <door> with <wrong key>`:
  - `{actor.You} {verb:try} to {verb:lock} the {object.direct} with the {object.indirect}, but it does not fit the lock.`
- `open <door>` when door is locked:
  - `{actor.You} cannot open the {object.direct}; it is locked.`
- When an explicit `with <key>` target is provided and incompatible, use wrong-key messaging instead of generic locked/no-key messaging.
- These capture-failure defaults may be overridden by the same-door facade policy surface.

Idempotent defaults (actor-only):

- already open: `The {object.direct} is already open.`
- already closed: `The {object.direct} is already closed.`
- already locked: `The {object.direct} is already locked.`
- already unlocked: `The {object.direct} is already unlocked.`

Success defaults:

- `go` auto `unlockAndOpen`:
  - source room semantic: `{actor.You} {verb:unlock} the {object.direct} with the {object.indirect}, {verb:open} it, and {verb:leave}.`
  - fallback source semantic when key label is unavailable: `{actor.You} {verb:unlock} the {object.direct}, {verb:open} it, and {verb:leave}.`
  - destination room line (opposite-room audience): `The {object.direct} {verb:open} and {actor.name} {verb:enter}.`
- `go` auto `open`:
  - source room semantic: `{actor.You} {verb:open} the {object.direct} and {verb:leave}.`
  - destination room line (opposite-room audience): `The {object.direct} {verb:open} and {actor.name} {verb:enter}.`
- `unlock <door>` command success:
  - actor semantic: `{actor.You} {verb:unlock} the {object.direct}.`
  - opposite room broadcast: `The {object.direct} unlocks with a click.`
- `open <door>` command success:
  - actor semantic: `{actor.You} {verb:open} the {object.direct}.`
  - actor semantic when a key target is used to clear lock: `{actor.You} {verb:open} the {object.direct} with the {object.indirect}.`
  - opposite room broadcast: `The {object.direct} opens.`
- `close <door>` command success:
  - actor semantic: `{actor.You} {verb:close} the {object.direct}.`
  - opposite room broadcast: `The {object.direct} closes.`
- `lock <door>` command success:
  - actor semantic: `{actor.You} {verb:lock} the {object.direct}.`
  - actor semantic when key target is used: `{actor.You} {verb:lock} the {object.direct} with the {object.indirect}.`
  - opposite room broadcast: `The {object.direct} locks with a click.`

Door naming fallback:

- If a facade/binding does not supply a door display name, default to `{direction} door` from the actor viewpoint (for example `north door`, `up door`).
- For opposite-room messaging, use the opposite direction viewpoint fallback (for example actor sees `north door`, opposite side sees `south door`).

Movement narration de-dup rule:

- When `go` emits a composed door+movement semantic success line (`open ... and leave` or `unlock ... open ... and leave`), generic movement leave/arrive defaults for that same action must be suppressed.
- This prevents duplicate movement narration in both rooms.

---

## Predicate and Query Support

Door state must be queryable in a stable way for descriptive predicates.

Required query concepts:

- `isDoorClosed`
- `isDoorLocked`

Query APIs should avoid exposing raw directional storage internals.

Two query surfaces are acceptable:

- exit/direction scoped queries for command and perception flow
- overlay-keyed queries when overlay identity is an intentional abstraction

Recommended v1-facing query shape:

- `q.isDoorClosed(direction)`
- `q.isDoorLocked(direction)`
- `q.isDoorClosedBetween(roomARef, roomBRef)`
- `q.isDoorLockedBetween(roomARef, roomBRef)`

Semantics:

- Directional forms evaluate door state relative to the current render context room.
- `Between(...)` forms evaluate explicit room-pair door state and do not require actor presence in either room.
- `Between(...)` forms are the preferred path for lifecycle/system checks where no local actor/room viewpoint exists.

Constraint:

- overlay identity in v1 must be runtime-derived and non-persistent
- no persisted virtual door IDs are introduced in this phase

---

## Trapped Actor / Spawn-in-Locked-Room Handling

Spawn-in-locked-room handling is out of scope for VirtualDoor and belongs to movement/lifecycle safety policy.

VirtualDoor responsibilities:

- expose consistent door state
- provide deterministic lock/open query and mutation behavior

Movement/lifecycle safety responsibilities:

- prevent or resolve soft-lock/trap situations (for example key on inaccessible side)
- define and enforce egress policy
- produce deterministic diagnostics

This policy area should be specified in movement/lifecycle documentation, not in VirtualDoor contract.

---

## Command Architecture Integration (v1 Boundary)

v1 integration is intentionally narrow.

Required:

- `go <direction>` remains exit-resolved as today.
- Door checks for movement consult virtualized state when pair is virtual.
- Mutations targeting door edges route through VirtualDoor service for virtualized pairs.
- Movement ergonomics are handled automatically by `go`:
  - if door is closed and unlocked, `go` auto-opens and continues movement
  - if door is locked and actor carries matching key, `go` auto-unlocks, auto-opens, and continues movement
  - player is not required to type `open`/`unlock` first in these success cases

Not required in v1:

- introducing first-class door entities into global entity resolution contracts
- introducing a mandatory new “door target” resolution surface for all commands

Door-target UX (for example bound item views) can be layered without making Door a required global resolver category in v1.

### Movement Ergonomics (Required Default)

For player ergonomics, automatic door handling is the default movement policy.

`go <direction>` behavior:

1. No door on edge:

- normal movement.

1. Door already open:

- normal movement.

1. Door closed + unlocked:

- auto-open door.
- proceed with movement.
- actor source-room semantic (default): `{actor.You} {verb:open} the {object.direct} and {verb:leave}.`
- destination-room line (opposite-room audience, default): `The {object.direct} {verb:open} and {actor.name} {verb:enter}.`

1. Door closed + locked + matching key in actor inventory:

- auto-unlock door.
- auto-open door.
- proceed with movement.
- actor source-room semantic (default): `{actor.You} {verb:unlock} the {object.direct} with the {object.indirect}, {verb:open} it, and {verb:leave}.`
- fallback default when key label is unavailable: `{actor.You} {verb:unlock} the {object.direct}, {verb:open} it, and {verb:leave}.`
- destination-room line (opposite-room audience, default): `The {object.direct} {verb:open} and {actor.name} {verb:enter}.`

1. Door closed + locked + no matching key:

- movement is blocked.
- actor receives locked failure line per existing command/message policy.

Notes:

- These auto transitions are movement affordances, not separate player commands.
- The actor does not need to specify a key target for this movement path.
- Matching key check uses VirtualDoor `lockedBy` policy in virtual mode and side-local `lockedBy` in non-virtual mode.
- Generic movement leave/arrive lines are suppressed for these composed `go` success cases to avoid duplicate narration.

---

## Facade Item Overrides and Mutation Routing

Bound item views may implement custom `planDirect` behavior.

v1 policy:

- Facade item `planDirect` is allowed to emit door mutation instructions.
- Facade item `planDirect` may also emit custom render/bubble instructions.
- Facade item logic must not directly mutate directional room-door records in virtualized mode.

Routing guarantee:

- If a virtual door exists for the targeted pair/edge, door-state mutation instructions (`open`, `close`, `unlock`, `unlockAndOpen`, `closeAndLock`) are resolved against VirtualDoor authority.
- VirtualDoor then mirrors resulting state to backing directional records.
- This guarantees shared-state semantics even when mutation instructions originate from a side-bound item override.

This allows flexible per-side interaction scripting while preserving state integrity at the mutation boundary.

---

## Capture Policy for Bound Facade Items

Bound facade items are allowed to participate in capture-phase veto for door interactions.

Decision model:

- `allow = facadeCanDirect && virtualDoorCanDirect`
- `veto = !allow`

Implications:

- Either layer may veto.
- Facade item may deny for side-local narrative/policy reasons.
- VirtualDoor may deny for shared-state/key/invariant reasons.
- A facade allow does not bypass VirtualDoor policy.

Capture constraints:

- Capture decisions are read-only.
- No mutation is allowed during capture at either layer.
- Message selection follows existing capture error/override precedence rules.

---

## Mutation Instructions and Key Validation

Recommended v1 door mutation instruction set:

- `open`: unlocks the virtual door and opens it.
- `close`: closes the virtual door; does not lock.
- `unlock`: unlocks the virtual door; does not open.
- `unlockAndOpen`: unlocks the virtual door and opens it.
- `closeAndLock`: closes the virtual door (if open) and locks it.

Designer ergonomics note:

- `unlockAndOpen` and `closeAndLock` are first-class instructions even though each can be represented as two lower-level steps.

Policy split:

- Key/permission checks occur in capture/plan policy.
- Mutation instructions perform state transition only.
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

Keyed unlock/open example:

- Player input: `unlock north door with small gold key`
- Resolution binds:
  - direct target: north door (facade/virtual)
  - indirect target: `small gold key`
- Capture/plan checks compare required `lockedBy` against the resolved key target.
- If key does not match, command is rejected before mutation.
- If key matches, emit `unlockAndOpen` (or `open`) instruction.
- In virtualized pairs, instruction is applied to VirtualDoor authority and mirrored to both backing directional records.

This keeps validation and author intent explicit while preserving a clean mutation boundary.

---

## Door Mutation Outcome Matrix (v1)

This section defines default outcome semantics for door mutation instructions.

General rules:

- Mutations are state transitions; validation happens in capture/plan.
- `open` and `unlockAndOpen` intentionally converge to the same resulting state.
- Idempotent calls are allowed and should not be treated as hard errors.
- Missing/unresolvable door target should warn and noop.
- Actorless mutations (lever/script/system) do not emit actor semantic lines.

### `open`

- If door is locked: clear lock, set `closed = false`.
- If door is closed + unlocked: set `closed = false`.
- If already open + unlocked: noop (idempotent success).
- If target missing: warn + noop.

### `unlock`

- If door is locked and key policy passes: clear lock only.
- If door is unlocked: noop (idempotent success).
- If key required and missing/wrong: reject in capture/plan.
- If target missing: warn + noop.

### `unlockAndOpen`

- If door is locked and key policy passes: clear lock, set `closed = false`.
- If door is closed + unlocked: set `closed = false`.
- If already open + unlocked: noop (idempotent success).
- If key required and missing/wrong: reject in capture/plan.
- If target missing: warn + noop.

### `close`

- Set `closed = true`; do not change `locked`.
- If already closed: noop (idempotent success).
- If target missing: warn + noop.

### `closeAndLock`

- Ensure `closed = true`, then set `locked = true`.
- If already closed + locked: noop (idempotent success).
- If key-to-lock policy exists and fails: reject in capture/plan.
- If target missing: warn + noop.

### Failure Surface Split

- Capture/plan failures (policy/key/veto) are command failures with player-facing error messaging.
- Mutation-stage missing target is operational (`warn + noop`) by default.

### With-Actor vs Actorless Messaging Surface

- With actor: semantic self/others plus optional room/opposite-room broadcast per door policy.
- Without actor: no actor semantic line; room/opposite-room broadcast only when a target room context exists.

---

## Validation Requirements

Validation should surface:

- reciprocal exits without reciprocal door records
- reciprocal door records with asymmetrical `virtualDoor: false` opt-out (informational)
- candidate pairs with multiple exits to the same counterpart room (non-virtual, warn)
- virtual candidates with conflicting `lockedBy`
- virtual candidate bound to missing item id
- impossible authored state at load time (locked false/closed true is allowed; locked true/closed false is not) before normalization/reconciliation

Validation should warn by default, strict-fail in strict validation mode.

---

## Migration Strategy

1. Detect virtual candidates from existing reciprocal door records.
2. Virtualize by default unless explicitly disabled.
3. Preserve existing raw records as storage source of truth.
4. Add compatibility logs showing which pairs were virtualized.
5. Allow opt-out (`virtualDoor: false`) per side where existing content depends on directional asymmetry.

This keeps migration additive and reversible.

---

## Reversibility Guarantees (Required)

To keep migration to a future first-class Door straightforward, v1 must guarantee:

- No persisted virtual door identity is introduced.
- No schema migration is required for existing directional room-door records.
- VirtualDoor remains an internal runtime implementation detail.
- Public APIs must not require access to raw directional storage internals.
- All virtual door reads/writes pass through one internal service boundary.
- Pairing and conflict outcomes are deterministic per load cycle.

These guardrails ensure a future first-class Door can replace internals without forcing author-facing rewrites.

---

## Why This Is Better Than Current Back-Bending

Without a first-class door object, teams currently emulate one by custom scripts and conventions.
This proposal formalizes that pattern into one coherent overlay with predictable behavior.

Benefits:

- less repeated script logic
- fewer silent state drifts
- clearer message behavior
- easier designer onboarding
- cleaner path to a true first-class Door later, if desired

---

## Open Decisions

1. Whether virtual overlay should emit dedicated lifecycle events.

---

## Planned Player Command Surface (v1)

To match the mutation model and avoid ambiguity, v1 assumes explicit player door commands:

- `open <door>` (optionally `with <key>` when key targeting is required)
- `close <door>`
- `lock <door>` (optionally `with <key>` when key targeting is required)
- `unlock <door>` (optionally `with <key>` when key targeting is required)

Command-to-mutation mapping:

- `open <door>` -> `open`
- `close <door>` -> `close`
- `lock <door>` -> `closeAndLock`
- `unlock <door>` -> `unlock`

Notes:

- `go <direction>` movement ergonomics still auto-open / auto-unlock+open as defined above; explicit door commands remain available for deliberate door-state control.
- `lock` does not require a separate `lock` mutation instruction; it routes to `closeAndLock` by design.
- `unlockAndOpen` remains an internal/planning mutation instruction for ergonomics and scripted flows; player-facing exposure as a separate verb is optional.
- Key policy checks for `lock`/`unlock` remain capture/plan responsibilities (`lockedBy` policy), not mutation-layer responsibilities.

---

## Implementation Plan (Temporary)

This section is intentionally temporary and non-normative.

Removal rule:

- Remove this section after VirtualDoor v1 implementation, tests, and documentation updates are complete and merged.
- Keep only stable behavior contract sections in this file after removal.

### Phase 0: Service and Lifecycle Wiring

Checklist:

1. Add `bundles/bundle-rantamuta/lib/world/virtual-door-service.js`.
2. Implement `ensureVirtualDoorService(state)` (idempotent), `getVirtualDoorService(state)`, and `disposeVirtualDoorService(state)` using a module-local `WeakMap`.
3. Add `bundles/bundle-rantamuta/server-events/virtual-door-startup.js` with:

- `startup`: prewarm `ensureVirtualDoorService(state)`.
- `shutdown`: call `disposeVirtualDoorService(state)`.

1. Do not attach service instances directly to `GameState`.
2. Make `getVirtualDoorService(state)` the public accessor and require it to auto-call idempotent `ensureVirtualDoorService(state)` when needed.
3. Callers (command/query/mutator) should use `getVirtualDoorService(state)`, not `ensure...` directly.
4. No special scenario-runner bootstrap call is required when door code paths consistently use `getVirtualDoorService(state)`.

### Phase 1: Pairing, Authority, and Queries

Checklist:

1. Implement pairing scan over loaded rooms/exits/door records.
2. Enforce eligibility and conflict rules from this spec (including `lockedBy` mismatch fallback to non-virtual).
3. Implement virtual authority state for eligible pairs and mirror writes to both directional records.
4. Add canonical query methods to `q` facade:

- `q.isDoorClosed(direction)`
- `q.isDoorLocked(direction)`
- `q.isDoorClosedBetween(roomARef, roomBRef)`
- `q.isDoorLockedBetween(roomARef, roomBRef)`

1. Remove/replace provisional door query names.

### Phase 2: Mutation Execution

Checklist:

1. Update mutator instruction support to:

- `open`
- `close`
- `unlock`
- `unlockAndOpen`
- `closeAndLock`

1. Route virtualized-edge mutations through VirtualDoor service.
2. Preserve non-fatal behavior for missing/unresolvable target (`warn + noop`).
3. Maintain idempotent success behavior for no-op transitions.

### Phase 3: Command Surface and Movement Ergonomics

Checklist:

1. Update `go` behavior to:

- auto `open` for closed+unlocked door
- auto `unlockAndOpen` for locked door when matching key is available
- fail locked path when key check fails

1. Emit composed semantic success lines for auto-open paths and suppress duplicate generic movement leave/arrive narration in those paths.
2. Add explicit command handlers:

- `close <door>`
- `open <door>` (with optional key targeting)
- `lock <door>` (with optional key targeting)
- `unlock <door>` (with optional key targeting)

1. Route command mutations to the instruction set defined in this spec.

### Phase 4: Content and Test Updates

Checklist:

1. Update test-area examples that still use legacy door mutation instruction names.
2. Update predicate examples in test content to use canonical door query names.
3. Add/adjust unit tests for:

- service pairing logic
- mutation semantics and invariants
- query semantics
- go auto-open/auto-unlock behavior
- explicit open/close/lock/unlock commands

1. Update scenario coverage for both success and failure key paths.

### Phase 5: Cross-Spec and Manual Updates

The following documents must be updated when implementation lands:

1. `docs/normative/VirtualDoor.md`

- keep as `draft-v1` while decisions are open
- promote to binding only after behavior and tests are stable

1. `docs/normative/CommandArchitecture.md`

- add explicit door-command and `go` auto-door behavior phase ownership
- document capture/plan responsibility for key validation
- document render de-dup expectation for composed door+movement lines

1. `docs/normative/EntityResolution.md`

- document how door targets are resolved for `open/close/lock/unlock`
- document expected exit/door naming fallback behavior for unresolved facade names

1. `docs/normative/PredicateStateRendering.md`

- update allowed `q` API list to include canonical door query methods
- remove any outdated provisional door query references

1. `docs/normative/SemanticMessaging.md` (if promoted to binding)

- ensure templates used by default door messaging are valid under semantic renderer constraints

1. `docs/BundleRantamutaTechnicalManual.md`

- add implementation map for VirtualDoor service, startup listener, query integration, mutator routing, and command behavior

1. `docs/DesignerManual.md`

- add designer-facing guidance for door behavior, key expectations, and default fallback naming (`north door`, `up door`, etc.)
- explain override points for facade messaging and policy

Completion criteria for this phase:

- implementation and tests are green
- all listed docs are synchronized
- this temporary implementation section is removed from this draft
