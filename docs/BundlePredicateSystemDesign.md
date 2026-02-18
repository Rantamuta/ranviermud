# Bundle Predicate System (Design Proposal)

## Status

Draft design for maintenance-mode implementation in `ranviermud`.

This document proposes area-scoped, named predicates that can be referenced from YAML (and later inline description tags) without introducing engine-level expression evaluation.

## Problem Statement

Current stateful room rendering supports `when: <name>` checks through `room.renderPredicates`, usually assigned by room scripts at runtime. That works, but it is:

- Room-script centric instead of area-content centric
- Harder to validate statically from YAML
- Not yet a reusable contract for future inline description tags

We want a bundle/area predicate surface where authors define named checks once and reuse them by name (`isBell`, `slab_open`, etc.) in content.

## Goals

- Add area-level predicate definitions at `areas/<area>/predicate.js`.
- Let YAML and future inline tags reference predicates by name.
- Keep evaluation read-only and deterministic.
- Preserve current compatibility contracts (boot sequence, bundle loading, tick behavior).
- Keep implementation incremental and reversible.

## Non-Goals

- No general expression language.
- No mutation API in predicates.
- No architectural rewrite of area/script loading.
- No changes to CLI/config contracts unless explicitly gated.

## File and Authoring Contract

Each area may define:

- `bundles/<bundle>/areas/<area>/predicate.js` (optional)

Export format (v1, single supported shape):

```js
module.exports = {
  isBell: ({ actor, state, context }) => true,
  slab_open: ({ actor, state, context }) => false,
};
```

Rules:

- Export must be a plain object.
- Keys are predicate names (`^[A-Za-z_][A-Za-z0-9_]*$`).
- Values must be synchronous functions returning `true` or `false`.
- Predicates must be side-effect free and read-only.

## Standard Predicate Input

Predicate signature:

- `({ actor, state, context }) => boolean`

Input fields:

- `actor`: read-only actor view or `null`
- `state`: read-only query facade (no mutators)
- `context`: read-only metadata for the call site

`context` (v1):

- `room`: room being rendered/evaluated, read-only view or `null`
- `area`: current area, read-only view or `null`
- `source`: string describing caller, e.g. `room.descriptionVariants`
- `meta`: optional caller-defined object for future use

Rationale:

- Matches the requested `(actor, state, context)` intent.
- Keeps one stable input shape across YAML predicates and future inline tags.
- Avoids exposing full mutable engine entities directly.

## Read-Only and Safety Contract

JavaScript cannot prove purity, so v1 uses practical guardrails:

- Evaluator deep-freezes input objects before invocation.
- `state` is a query-only facade (no setters, no mutation methods).
- Predicate exceptions are caught; failures evaluate to `false`.
- Non-boolean returns evaluate to `false` and emit a warning.

Design invariant:

- Predicate evaluation must never be required for world progression, only for presentation and conditional checks.

## Predicate Resolution Semantics

Named predicate lookup:

1. If name is qualified (`areaName:predicateName`), resolve that area registry directly.
2. If name is unqualified (`predicateName`):
   - Evaluate room-local `room.renderPredicates[predicateName]` first (legacy compatibility).
   - Otherwise evaluate current area `predicate.js` map.
3. If unresolved, return `false` (warn once per predicate key and source).

This preserves existing behavior while allowing migration to area-level predicates.

## YAML Integration

No YAML shape change required.

Existing fields continue to work:

- `metadata.descriptionVariants[].when`
- `metadata.descriptionFragments[].when`

Example:

```yaml
metadata:
  descriptionVariants:
    - when: isBell
      text: "The old bell hums with a thin metallic resonance."
  descriptionFragments:
    - when: slab_open
      text: "A stone slab has shifted, revealing steps below."
```

## Future Inline Tag Integration

This predicate system is the shared backend for future inline room tags.

For example, in a future parser:

- `[isBell:then|else]`

`isBell` would resolve through the same predicate interpreter and input contract.

## Validation and Tooling

Extend bundle validation in two levels:

1. Load-time validation:
   - `predicate.js` exports object map
   - predicate keys are valid identifiers
   - values are functions
2. Reference validation:
   - collect `when` keys from room YAML
   - verify each key resolves to either room-local predicate (known at runtime) or area predicate
   - default mode: unresolved keys are warnings
   - strict mode: unresolved keys are errors

This should be integrated into `util/validate-bundles.js` engine mode so validation reflects actual boot wiring.

## Runtime Behavior and Performance

- Predicates are loaded once per area during area load.
- Evaluation is synchronous.
- During a single render pass, predicate results may be memoized per `(predicateName, actor, room, source)` to avoid duplicate calls.
- On any evaluator error, fallback is deterministic (`false`).

## Observability

Log categories:

- `predicate.load.error` (invalid export)
- `predicate.lookup.missing` (unknown key)
- `predicate.eval.error` (thrown function)
- `predicate.eval.invalidReturn` (non-boolean)

Logging policy:

- Warn once per unique `(area, predicateName, source, code)` tuple to avoid spam.

## Compatibility and Migration Plan

Phase 1:

- Introduce area predicate registry and interpreter.
- Keep `room.renderPredicates` behavior unchanged.
- Use compatibility lookup order (room-local first, area second).

Phase 2:

- Migrate puzzle/room scripts that currently assign `room.renderPredicates` to area `predicate.js` where practical.
- Keep room-local predicates only for truly room-instance dynamic logic.

Phase 3 (optional):

- Add inline description tag parser that calls this interpreter.

Rollback:

- If issues occur, disable area predicate lookup and continue using existing room-local behavior.

## Open Questions

- Should unresolved `when` keys become hard errors in non-strict mode for maintenance 1.0?
- Do we need a config flag (for example `features.areaPredicates`) for staged rollout?
- Should cross-area qualified predicate names be allowed by default, or only current-area lookup?

## Minimal Test Matrix

1. Loads valid `predicate.js` and rejects invalid exports.
2. Resolves unqualified names from room-local then area map.
3. Resolves qualified names from explicit area.
4. Returns `false` on missing predicates.
5. Returns `false` on thrown predicates.
6. Rejects non-boolean return values.
7. Verifies input is read-only (mutation attempt fails).
8. Confirms deterministic output across repeated evaluations.
9. Confirms YAML `when` integration path remains unchanged.
