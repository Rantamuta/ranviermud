# Scoped Metadata Mutator Proposal (Draft)

## Status

- Status: `draft-v1`
- Scope: Framework-level mutation ops for area/world metadata
- Binding: no
- D3 sequencing note:
  - Implemented in D3: `deleteRoomMetadata`, `deleteAreaMetadata`, `deleteWorldMetadata`.
  - Implemented after D3: `setWorldMetadata` and `q.getWorldMetadata(...)`.
- Driver: Undying Village implementation needs cross-room and world-scope metadata without mixing content logic into runtime internals.
- Related:
  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/PredicateStateRendering.md`
  - `docs/normative/EntityResolution.md`
  - `docs/manuals/BundleRantamutaTechnicalManual.md`
  - `AGENTS.md`

## Purpose

Define a minimal, explicit framework contract for mutable metadata above room scope:

1. `setAreaMetadata`
2. `setWorldMetadata`
3. `deleteAreaMetadata`
4. `deleteWorldMetadata`

This keeps area content authored in `areas/**` while keeping mutation mechanics in runtime `lib/**` and `commands/**`.

## Problem Statement

Current runtime already supports:

- area-scoped predicate reads via `q.getAreaMetadata(areaRef, key)`
- write: `setRoomMetadata` in mutator commit flow

Current runtime does not support:

- write operation for area metadata
- write operation for world metadata
- delete operation for area metadata
- delete operation for world metadata
- explicit world metadata read helper (`q.getWorldMetadata(...)`)

Undying Village needs state that is broader than room scope. Implementing that only in area scripts would leak framework concerns into content.

## Goals

- Add explicit mutator instruction types for area and world scope metadata.
- Keep all writes in Commit via mutator operations only.
- Preserve rollback behavior and deterministic command flow.
- Keep runtime/content boundaries clear:
  - runtime owns generic mutation mechanics,
  - content owns when/why those mutations are emitted.

## Non-Goals

- No lore-specific IDs, predicates, or quest logic in runtime modules.
- No normative contract change in this draft.

## Proposed Surface

### 1) `setAreaMetadata` (new)

```js
{
  type: 'setAreaMetadata',
  key: 'stateKey',
  value: 'anyJsonSafeValue'
}
```

Semantics:

- Resolve target area from current command context only.
- Write `area.metadata.values[key] = value`.
- Key validation follows existing safe metadata key conventions.
- `value` may be any JSON-safe value except `undefined`.
- `null` is allowed as a normal storable value (not delete).
- Return inverse operation for rollback.
- Cross-area targeting is not supported in v1.

### 2) `setWorldMetadata` (new)

```js
{
  type: 'setWorldMetadata',
  key: 'stateKey',
  value: 'anyJsonSafeValue'
}
```

Semantics:

- Write to a bundle-owned world metadata state store.
- Key validation follows existing safe metadata key conventions.
- `value` may be any JSON-safe value except `undefined`.
- `null` is allowed as a normal storable value (not delete).
- Return inverse operation for rollback.

Storage pattern:

- Use a bundle runtime service keyed by `GameState` (same lifecycle pattern used by virtual-door service `WeakMap` registry).
- Do not hardcode content IDs in the service.

### 3) `deleteAreaMetadata` (new)

```js
{
  type: 'deleteAreaMetadata',
  key: 'stateKey'
}
```

Semantics:

- Resolve target area from current command context only.
- Delete key at dot path from `area.metadata.values`.
- Use the same key validation/path rules as `setAreaMetadata`.
- Return inverse operation for rollback.
- Cross-area targeting is not supported in v1.

### 4) `deleteWorldMetadata` (new)

```js
{
  type: 'deleteWorldMetadata',
  key: 'stateKey'
}
```

Semantics:

- Delete key at dot path from world metadata state store.
- Use the same key validation/path rules as `setWorldMetadata`.
- Return inverse operation for rollback.

### 5) Metadata Query Naming (proposed)

Target query helper family:

- `q.getRoomMetadata(roomRef, key)`
- `q.getAreaMetadata(areaRef, key)`
- `q.getWorldMetadata(key)`

Naming convention note:

- Metadata keys use dot-separated `camelCase` segments.
- Predicate identifiers remain separate and continue using `kebab-case`.

### 6) `q.getWorldMetadata` (new read helper)

```js
q.getWorldMetadata('stateKey')
```

Semantics:

- Read-only predicate helper for world-scope metadata from the same world metadata state store.
- Must remain side-effect free, like all predicate query methods.

## Architecture and Invariants

- CommandArchitecture: writes happen only in Commit through mutator operations.
- PredicateStateRendering: predicates remain read-only and never mutate.
- AGENTS layering boundary:
  - `lib/**` and `commands/**` stay content-agnostic,
  - `areas/**` scripts may emit these operations for authored behavior,
  - runtime must not embed area/room/puzzle IDs.

Area-scope authority rule (v1):

- `setAreaMetadata` is current-area only.
- The operation must not allow authored payloads to target a different area.
- Attempts to target other areas must fail validation.

## Minimal Implementation Sketch (For Future Work)

Framework touch points:

- `bundles/bundle-rantamuta/lib/session/mutator.js`
  - add `setAreaMetadata`, `setWorldMetadata`, `deleteAreaMetadata`, and `deleteWorldMetadata` instruction handling
- `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`
  - add read helper `q.getWorldMetadata(...)`
- `bundles/bundle-rantamuta/lib/**` (new small world metadata service module)
  - own world metadata registry
- `bundles/bundle-rantamuta/tests/mutator.test.js`
  - add op validation, apply, and rollback tests for all new metadata instructions
- `bundles/bundle-rantamuta/tests/predicate-runtime*.test.js`
  - add `q.getWorldMetadata` read tests
- `docs/manuals/DesignerManual.md`
  - document new mutator operations once implemented

Content touch points:

- area scripts only, emitting operations in `plan.operations` when needed.

## Acceptance Criteria (Proposal Scope)

- Proposal is documented outside lore docs.
- Runtime/content domain separation is explicit.

## Completed Follow-up

Room metadata surface migration is complete:

- `setRoomFlag` replaced by `setRoomMetadata`
- authored room-scope metadata ops no longer accept `roomRef`; target is current room via actor context
- metadata query helper family uses:
  - `q.getRoomMetadata(...)`
  - `q.getAreaMetadata(...)`
  - `q.getWorldMetadata(...)`

## D1 Alignment Target State (Follow-up Policy)

For D1 flags/values alignment work:

- `metadata.values` is the canonical namespace for metadata values.
- Key naming is convention-driven (camelCase recommended), not validator-enforced by the D1 alignment task.
