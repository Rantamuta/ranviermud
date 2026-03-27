# VirtualDoor Implementation Checklist (v1)

Source of truth:
- `docs/normative/VirtualDoor.md` (`normative`, binding)

Purpose:
- Provide an execution checklist that is strict on required behavior and flexible on internal structure.
- Avoid over-specifying helper names, map layouts, or parser internals unless the normative contract requires them.

## 1) Service Lifecycle

- [x] [Required] Add bundle-owned VirtualDoor service module (path is implementation choice, e.g. `bundles/bundle-rantamuta/lib/doors/virtual-door-service.js`).
- [x] [Required] Export service lifecycle accessors:
  - `ensureVirtualDoorService(state)` (idempotent)
  - `getVirtualDoorService(state)` (auto-ensure)
  - `disposeVirtualDoorService(state)`
- [x] [Required] Store service instances in module-local registry keyed by `state` (do not attach ad hoc fields to `GameState`).
- [x] [Required] Add bundle server event listener for startup/shutdown:
  - startup prewarms `ensureVirtualDoorService(state)`
  - shutdown disposes service

## 2) Pairing and Authority

- [x] [Required] Build virtual pair detection with eligibility rules:
  - reciprocal exits
  - reciprocal directional door records
  - exactly one exit each direction for the pair
  - either side `virtualDoor: false` disables virtualization
- [x] [Required] Implement `lockedBy` resolution:
  - both set and same -> use that key
  - one set / one omitted -> use set key
  - conflict -> non-virtual + warn
- [x] [Required] Implement load/reload reconciliation:
  - `aClosed = A.closed || A.locked`
  - `bClosed = B.closed || B.locked`
  - `vDoor.closed = aClosed || bClosed`
  - `vDoor.locked = A.locked || B.locked`
  - reflect effective state to both directional records
- [x] [Required] Implement service-level `mutateDoor({ actor, fromRoomRef, direction, roomRef, mutation })` API with supported mutations:
  - `open` | `close` | `unlock` | `unlockAndOpen` | `closeAndLock`
- [x] [Required] Enforce invariant `locked => closed` through VirtualDoor mutation API.
- [x] [Required] For virtualized pairs, all door-state writes must route through VirtualDoor service APIs.
- [x] [Required] Direct legacy writes (`room.openDoor/closeDoor/lockDoor/unlockDoor`) are out of contract for virtualized pairs.
- [x] [Required] Commit atomicity:
  - reflection to both directional records is one logical mutator operation
  - partial failure must rollback both to pre-operation state

## 3) Mutation Integration

- [x] [Required] Add canonical mutator instruction:
  - `type: 'operateDoor'`
  - `mutation: 'open' | 'close' | 'unlock' | 'unlockAndOpen' | 'closeAndLock'`
  - target via direction or roomRef (and actor/fromRoomRef as needed)
- [x] [Required] Route `operateDoor` through VirtualDoor service mutation API.
- [x] [Required] Preserve idempotent success and unresolved-target `warn + noop`.
- [x] [Required] Keep legacy instruction aliases for compatibility:
  - `openDoor` -> `operateDoor/open`
  - `closeAndLockDoor` -> `operateDoor/closeAndLock`
- [x] [Required] Add movement de-dup support in mutator (e.g. `suppressRoomBroadcast` or equivalent) for composed `go` messages.

## 4) Query Integration (`q`)

- [x] [Required] Replace provisional door query API with canonical names:
  - `q.isDoorClosed(direction)`
  - `q.isDoorLocked(direction)`
  - `q.isDoorClosedBetween(roomARef, roomBRef)`
  - `q.isDoorLockedBetween(roomARef, roomBRef)`
- [x] [Required] Virtualized pairs read from VirtualDoor effective state.
- [x] [Required] Non-virtual pairs read from directional records.
- [x] [Required] Unresolvable query input returns `false` and may warn.

## 5) Commands and Movement

- [x] [Required] Implement command surface:
  - `open <door>` (optional `with <key>`)
  - `close <door>`
  - `lock <door>` (optional `with <key>`)
  - `unlock <door>` (optional `with <key>`)
- [x] [Required] Command-to-mutation mapping:
  - `open` -> `open`
  - `close` -> `close`
  - `lock` -> `closeAndLock`
  - `unlock` -> `unlock`
- [x] [Required] `go <direction>` auto-door behavior:
  - no door -> move
  - door open -> move
  - closed+unlocked -> auto `open`, move
  - locked+matching key -> auto `unlockAndOpen`, move
  - locked+no key -> fail in capture/plan
- [x] [Required] `go` composed door+movement success suppresses generic movement leave/arrive duplication.

## 6) Key Validation and Messaging

- [x] [Required] Key matching uses key definition ref (`entityReference` / `lockedBy`), not instance UUID.
- [x] [Required] Multiple copies of the same matching key are valid (not ambiguous).
- [x] [Required] Explicit `with <key phrase>` behavior:
  - resolve phrase candidates from inventory
  - filter by `entityReference === lockedBy`
  - if candidates remain, choose deterministically via `EntityResolution.md` ordering
  - chosen candidate only affects displayed key label
  - if none remain, fail wrong-key
  - do not fall back to other inventory keys
- [x] [Required] No explicit key behavior: auto-select any carried matching key for `open`/`unlock`/`lock`.
- [x] [Required] Implement default message matrix from `docs/normative/VirtualDoor.md` for capture-failure/idempotent/success.
- [x] [Required] Keep opposite-room lines as explicit cross-room delivery (not actor-room semantic `others`).

## 7) Content and Test Migration

- [x] [Required] Update test content to use canonical `operateDoor` instruction payload.
- [x] [Required] Update test predicates to use canonical `q.isDoor*` query API.
- [x] [Required] Add/adjust test rooms to cover:
  - virtualized reciprocal pair (matching `lockedBy`)
  - non-virtual/asymmetry regression case
  - facade bindings and fallback naming
- [x] [Required] Add or update automated tests:
  - service pairing and conflict behavior
  - reconciliation and invariants
  - atomic rollback behavior
  - mutation instruction behavior (+ legacy aliases)
  - command matrix (`open/close/lock/unlock`, right/wrong/implicit key)
  - `go` auto-open/auto-unlock-and-open and movement de-dup
  - predicate query API behavior
  - scenario coverage for opposite-room lines and wrong-key failures

## 8) Documentation Updates on Landing

- [x] [Required] Update:
  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/EntityResolution.md`
  - `docs/normative/PredicateStateRendering.md`
  - `docs/BundleRantamutaTechnicalManual.md`
  - `docs/DesignerManual.md`
- [x] [Required] Move `docs/normative/VirtualDoor.md` from draft state to binding only after behavior/tests are complete.
- [x] [Required] Update `docs/normative/README.md` when VirtualDoor is promoted to current normative set.

## 9) Decisions / Optional Choices

- [x] [Decision Made] Strict-validation ownership/switch source resolved in normative doc:
  - ownership: `util/validate-bundles.js`
  - switch source: validator CLI `--strict`
- [x] [Optional] Concrete service internals (index map names, helper function names, folder layout) documented in `docs/BundleRantamutaTechnicalManual.md`.
- [x] [Optional] Parser-specific capability decision (v1): no additional parser flags/capabilities needed.
  - Rationale: door command behavior is achieved with existing entity-resolution rules, including `allowUnresolvedIndirect` for explicit `with <key>` messaging paths.
- [x] [Optional] Dedicated door-command helper module (`door-command-helper.js`) is used for shared door command logic and declaration ergonomics.

## 10) Done Criteria

- [x] [Required] `npm test` passes.
- [x] [Required] `npm run ci:local` passes.
- [x] [Required] No unresolved correctness regressions in final pass.
