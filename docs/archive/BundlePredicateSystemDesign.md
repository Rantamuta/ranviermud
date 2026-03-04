# Bundle Predicate System (v1, Restricted)

> Note: normative behavior now lives in `docs/normative/PredicateStateRendering.md`.
> This document remains as design history/context.

## Status

Draft design for `bundle-rantamuta`.

This version is intentionally strict. It supports descriptive tags in room and object text, and does not expose predicates to gameplay policy or mutation phases.

## Goal

Provide named, area-scoped predicates for description rendering only:

* room descriptions
* room detail descriptions
* object descriptions (items/NPCs as applicable)
* object room lines (`roomDesc`) when rendered

Predicates are for text selection, not game progression. Predicate evaluation must not be consulted by any code that influences mutation planning or veto decisions.
Predicates may depend on actor knowledge state to alter descriptive vocabulary and perception, but must not determine world mutability.
In v1, "actor knowledge state" means only the normalized `actor` view plus actor-scoped `q` results (for example `q.actorHasItem`, `q.actorHasEffect`, `q.actorQuestActive`, `q.actorQuestCompleted`).

## Hard Boundaries

Predicates are available only in description render paths.

Predicates are not available in:

* Capture
* Plan
* Commit
* React
* lifecycle hooks (`spawn`, `ready`, `updateTick`, etc.)

No script-level `predicateEvaluate(...)` API is provided in v1.

## Authoring Model

Each area may define:

```
bundles/<bundle>/areas/<area>/predicates.js
```

Export contract:

```js
module.exports = {
  isSlabOpen: ({ actor, q, context }) => true,
  isBellActive: ({ actor, q, context }) => false,
};
```

Rules:

* export must be a plain object
* key regex: `^[A-Za-z_][A-Za-z0-9_]*$`
* values must be synchronous functions
* only `=== true` counts as true
* non-boolean returns evaluate to `false`
* thrown exceptions evaluate to `false`

## Tag Usage

Description tags reference predicate names.

Example:

```text
The bell [isBellActive:hums softly|hangs silent].
```

The same predicate names may also be used by declarative `when:` fields in description variant/fragment metadata if enabled by the renderer.

## Predicate Input Contract

Predicate signature:

```js
({ actor, q, context }) => boolean
```

### `actor`

Nullable viewer data (plain view, not full engine object).

Contract (v1):

```js
actor = {
  ref: "player:rendall",
  name: "rendall",
  level: 1,
  role: 2,
  roomRef: "rantamuta:resonance_chamber",
  effectIds: []
}
```

Rules:

* actor view is read-only and frozen before predicate invocation
* no raw Player instance is exposed
* no direct inventory/equipment/metadata object exposure on `actor`
* `actor` is `null` when no viewer exists in render context
* renderer never falls back to any other actor when `actor` is `null`

### `context`

Plain data object, for example:

```js
{
  source: "room.description",
  areaRef: "rantamuta",
  roomRef: "rantamuta:bell_crypt",
  entityRef: "rantamuta:crackedBell"
}
```

### `q` (Read-only Query Facade)

Initial v1 methods:

```js
q.roomFlag(roomRef, key) => boolean
q.areaFlag(areaRef, key) => boolean
q.roomHasItem(roomRef, itemRef) => boolean
q.currentContainerHasItem(itemRef) => boolean
q.roomContainerHasItem(roomRef, containerRef, itemRef) => boolean
q.actorHasItem(itemRef) => boolean
q.actorHasEffect(effectId) => boolean
q.actorQuestActive(questRef) => boolean
q.actorQuestCompleted(questRef) => boolean
```

Constraints:

* query-only methods
* no mutators
* no raw engine object exposure
* actor-dependent `q` methods return `false` when `actor` is `null`
* actor knowledge must be inferred only from the `actor` contract and actor-scoped `q` methods

Reference semantics (v1):

* `roomRef`, `containerRef`, and `itemRef` are authored content refs (`area:id`), not runtime UUIDs.
* Predicate authors never reference runtime UUIDs.
* `currentContainerHasItem(itemRef)` is scope-bound to the currently rendered entity instance; when no current container exists in render context, it returns `false`.
* `roomContainerHasItem(roomRef, containerRef, itemRef)` is scope-bound to the specified room and returns `true` when any matching container instance in that room contains the item.

## Resolution Rules

v1 lookup is area-local only:

1. resolve current area registry
2. if key exists, evaluate
3. if missing, return `false` and log warning

Not supported in v1:

* bundle-global predicate files
* cross-area predicate names
* compatibility fallback to `room.renderPredicates`

## Evaluation Semantics

For each tag or `when` check:

1. resolve predicate by name
2. build `{ actor, q, context }`
3. call synchronously
4. treat result as `true` only when `result === true`

Failure behavior:

* unknown key: `false`
* non-boolean return: `false`
* exception: `false`

No predicate failure throws to caller.

## Logging and Diagnostics

Warn once per unique:

```
${areaRef}:${predicateName}:${source}:${code}
```

Codes:

* `PREDICATE_MISSING`
* `PREDICATE_INVALID_RETURN`
* `PREDICATE_THROW`

Implementation note: duplicate keys inside a single JS object literal are not reliably detectable at runtime; v1 does not guarantee duplicate-key diagnostics.

## Determinism and Safety

Predicates must be pure functions of `(actor, q, context)` and current in-memory world state reachable through `q`.

Disallowed behavior:

* randomness
* wall-clock reads
* external I/O
* mutation

## Migration (Reference Bundle)

v1 intentionally removes `room.renderPredicates` in migrated areas.

Bell Tower content is migrated to area predicates and description tags/`when` usage under the new contract. No compatibility shim is included in v1.

## Minimal Implementation Checklist

1. add area predicate loader for `areas/<area>/predicates.js`
2. add predicate evaluation service (render-only callable)
3. wire service into room/object description rendering paths
4. wire service into description `when:` evaluation (if enabled)
5. add load-time validation for export shape
6. add warn-once diagnostics for missing/invalid/throwing predicates
7. migrate Bell Tower predicates to area registry
8. remove `room.renderPredicates` usage from migrated content
