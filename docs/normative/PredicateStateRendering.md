# Predicate State Rendering

This document defines the normative contract for state-dependent descriptive rendering using predicates.

## Status

- Status: `normative-v1`
- Binding: Yes
- Scope: Bundle-layer descriptive rendering for room state
- Related:
  - [CommandArchitecture.md](CommandArchitecture.md)
  - [EntityResolution.md](EntityResolution.md)

## Purpose

Define one authoritative, read-only method for rendering state-dependent room description text.

Core rule:

- Predicate evaluation is a render concern.
- Predicates must not participate in gameplay gating or mutation decisions.

## Scope

In v1, this contract applies to room-view rendering paths that evaluate `when:` predicates for:

- `metadata.descriptionVariants` (first-match wins)
- `metadata.descriptionFragments` (all matching fragments append in declaration order)

This is the normative method for stateful room description rendering.

Out of scope in v1:

- Capture/Plan/Commit/Bubble policy or mutation logic
- lifecycle script hooks (`spawn`, `ready`, `updateTick`)
- inline description tag syntax standardization

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

- `q.roomFlag(roomRef, key)`
- `q.areaFlag(areaRef, key)`
- `q.roomHasItem(roomRef, itemRef)`
- `q.currentContainerHasItem(itemRef)`
- `q.roomContainerHasItem(roomRef, containerRef, itemRef)`
- `q.actorHasItem(itemRef)`
- `q.actorHasEffect(effectId)`
- `q.actorQuestActive(questRef)`
- `q.actorQuestCompleted(questRef)`

Rules:

- `q` is read-only
- no mutators are exposed
- actor-scoped queries return `false` when actor context is absent

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

For room descriptions:

1. Evaluate `descriptionVariants` in declaration order.
2. Use the first variant whose `when` predicate returns `true`.
3. If no variant matches, use base room description.
4. Evaluate `descriptionFragments` in declaration order.
5. Append every fragment whose `when` predicate returns `true`.

Evaluation is read-only and must not mutate room/world metadata.
