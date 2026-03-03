# Predicate State Rendering

This document defines the normative contract for state-dependent descriptive rendering using predicates.

## Status

- Status: `normative-v1`
- Binding: Yes
- Scope: Bundle-layer descriptive rendering for room, item, and PC state
- Related:
  - [CommandArchitecture.md](CommandArchitecture.md)
  - [EntityResolution.md](EntityResolution.md)

## Purpose

Define one authoritative, read-only method for rendering state-dependent room, item, and PC description text.

Core rule:

- Predicate evaluation is a render concern.
- Predicates must not participate in gameplay gating or mutation decisions.

## Scope

In v1, this contract applies to room/item/PC rendering paths that evaluate predicate gates for:

- `metadata.descriptionVariants` (first-match wins)
- `metadata.descriptionFragments` (all matching fragments append in declaration order)

and inline tag templates in description text:

- `[predicate:then]`
- `[predicate:then|else]`

This is the normative method for stateful room/item/PC description rendering.

Out of scope in v1:

- Capture/Plan/Commit/Bubble policy or mutation logic
- lifecycle script hooks (`spawn`, `ready`, `updateTick`)
- descriptions beyond room/item/PC surfaces

## Phase Boundary

Predicate evaluation must occur only in render-time description assembly.

Predicates must not be evaluated in:

- Capture
- Plan
- Commit
- Bubble
- lifecycle hooks

Rationale:

- gameplay authority belongs to command phases
- descriptive variation belongs to rendering

## Registry Contract

Predicates are area-local.

Registry path:

`bundles/<bundle>/areas/<area>/predicates.js`

Export contract:

```js
module.exports = {
  is_example: ({ actor, q, context }) => true,
};
```

Rules:

- export must be an object map
- keys must match `^[A-Za-z_][A-Za-z0-9_]*$`
- values must be synchronous functions
- lookup is area-local only
- key naming convention (authoring): use snake_case yes/no question names.
  Preferred prefixes: `is_`, `can_`, `does_` (for example `is_slab_open`, `can_player_descend`, `does_basin_contain_stone`).

Not supported in v1:

- bundle-global predicate lookup
- cross-area predicate names
- compatibility fallback to `room.renderPredicates`

## Evaluation Contract

Evaluation signature:

```js
runtime.evaluate(name, renderContext) => boolean
```

Render context (runtime-owned):

- `actor`
- `room`
- `area`
- `world`
- `source`
- `entity`
- `currentContainer`

Predicate input:

```js
({ actor, q, context }) => boolean
```

Semantics:

- only `result === true` passes
- `false` fails
- non-boolean return fails
- thrown exception fails
- unknown predicate fails

Callers must never receive thrown predicate errors from evaluator failures.

## Read-Only Input Surfaces

### `actor` (normalized view)

Predicates receive a restricted actor view (or `null`), not a raw Player object:

- `ref`
- `name`
- `level`
- `role`
- `roomRef`
- `effectIds`

The actor view is read-only.

### `q` facade

Allowed v1 query methods:

- `q.getRoomMetadata(roomRef, key)`
- `q.getAreaMetadata(areaRef, key)`
- `q.getWorldMetadata(key)`
- `q.roomHasItem(roomRef, itemRef)`
- `q.currentContainerHasItem(itemRef)`
- `q.roomContainerHasItem(roomRef, containerRef, itemRef)`
- `q.actorHasItem(itemRef)`
- `q.actorHasEffect(effectId)`
- `q.actorQuestActive(questRef)`
- `q.actorQuestCompleted(questRef)`
- `q.isDoorClosed(direction)`
- `q.isDoorLocked(direction)`
- `q.isDoorClosedBetween(roomARef, roomBRef)`
- `q.isDoorLockedBetween(roomARef, roomBRef)`

Rules:

- `q` is read-only
- no mutators are exposed
- actor-scoped queries return `false` when actor context is absent
- door query semantics:
  - directional forms evaluate from current room context
  - `Between(...)` forms are actor-independent and use authored room refs
  - virtualized pairs read effective virtual-door state
  - non-virtual pairs read directional door records
  - unresolved door query input returns `false` (and may warn once)

### `context`

Predicates receive render metadata context:

- `source`
- `areaRef`
- `roomRef`
- `entityRef`

This object is read-only.

## Determinism and Safety

Predicates must be pure with respect to provided inputs and read-only world queries.

Predicates must not use:

- randomness
- wall-clock reads
- external I/O
- state mutation

Predicates may depend on actor knowledge/perception state for descriptive vocabulary, but must not determine world mutability.

## Diagnostics

Non-fatal predicate issues are warn-once per:

`${areaRef}:${predicateName}:${source}:${code}`

Codes:

- `PREDICATE_MISSING`
- `PREDICATE_INVALID_RETURN`
- `PREDICATE_THROW`

Load-time registry shape/name/function errors are logged and invalid entries are ignored.

## Rendering Behavior Rules

For room/item/PC descriptions:

1. Evaluate `descriptionVariants` in declaration order.
2. A variant is eligible when:
   - `when` is absent or evaluates `true`, and
   - `whenNot` is absent or evaluates `false`, and
   - at least one of `when` or `whenNot` is present.
3. Use the first eligible variant.
4. If no variant matches, use base room description.
5. Evaluate `descriptionFragments` in declaration order.
6. Append every eligible fragment using the same `when` / `whenNot` rules.

For inline tag templates in room/item/PC descriptions:

1. Evaluate tags at render-time assembly only.
2. Condition token resolves through `runtime.evaluate(name, renderContext)`.
3. Unknown predicates, thrown predicates, and non-boolean returns evaluate as `false`.
4. `then` branch renders when predicate is `true`; `else` branch (if present) renders when `false`.
5. Rendering remains read-only and must not mutate room/item/PC/world metadata.

Evaluation is read-only and must not mutate room/item/PC/world metadata.
