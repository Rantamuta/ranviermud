# SetWorldMetadata Implementation Plan

## Status

- Status: archived
- Type: implementation plan (not checklist)
- Scope: add `setWorldMetadata` mutator operation

## Goal

Implement `setWorldMetadata` so world-scope metadata writes are available in commit/mutator flow with rollback safety and no render-time mutation.

## Source Context

- `docs/drafts/ScopedFlagMutatorProposal.md`
- `docs/archive/implementations/D3-DeleteMetadataOps-Plan.md`
- `docs/normative/CommandArchitecture.md`
- `docs/normative/PredicateStateRendering.md`

## Current State (Observed)

- `deleteWorldMetadata` exists.
- World metadata service exists: `bundles/bundle-rantamuta/lib/session/world-metadata-service.js`.
- `setWorldMetadata` is not implemented.
- `q.getWorldMetadata(...)` is not implemented.

## Locked Decisions

1. `setWorldMetadata` writes world metadata under `metadata.values` using dot-path key semantics aligned with current metadata mutators.
2. `value` must reject `undefined`.
3. `value` must pass JSON-safe validation used by existing metadata mutators.
4. Writes occur only in commit/mutator phase.
5. Rollback must restore prior state with re-resolve-safe behavior (no stale object reference reliance).
6. Missing world roots are created on write (`state.metadata`, then `state.metadata.values`).
7. If present world roots are non-object values, coerce to object roots and emit warning-level logs.
8. Alignment with `setAreaMetadata` means key parsing, value validation, JSON-safe cloning, and subtree conflict rules; world write path keeps explicit no-pruning behavior for parent/root objects.

## Implementation Scope

1. Mutator contract updates:
   - Add `SetWorldMetadataInstruction` typedef.
   - Add union coverage in `MutationInstruction`.
2. Mutator implementation:
   - Add `applySetWorldMetadataInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js`.
   - Reuse existing path parsing/JSON-safe validation helpers where possible.
3. World metadata service:
   - Add or reuse `getOrCreateWorldMetadataValuesRoot(...)` for commit path.
   - Ensure behavior matches existing world delete service invariants.
   - Add warning-level logging when coercing non-object metadata roots.
4. Dispatch wiring:
   - Register `setWorldMetadata` in `applyMutationInstruction(...)`.
5. Tests:
   - Add/extend tests in `bundles/bundle-rantamuta/tests/mutator.test.js`:
     - apply + undo,
     - rollback on later failure,
     - key/value validation failures,
     - missing root creation on write.
6. Docs:
   - Update `docs/manuals/DesignerManual.md`.
   - Update `docs/manuals/BundleRantamutaTechnicalManual.md`.

## Out of Scope

- `q.getWorldMetadata(...)` read helper.
- Room metadata API renaming/migration.

## Validation

1. `npx mocha bundles/bundle-rantamuta/tests/mutator.test.js`
2. `npm test`
3. `npm run ci:local` (or `--in-place` when submodule pointer is not yet remote-resolvable)

## Checklist Review Passes

### Pass 1: Quality Control

- QC-1 Issue: wording collision between "aligned with `setAreaMetadata`" and no-pruning expectations.
  - Decision: constrain "aligned" to key/value/path validation semantics; preserve explicit no-pruning behavior for world metadata writes.
- QC-2 Issue: coercion warning behavior was present in checklist but not explicitly locked in plan.
  - Decision: lock warning-level coercion behavior and require a stable warning prefix in service/mutator path.
- QC-3 Issue: behavior slice `S3` was marked `mechanical` while including dispatch behavior wiring.
  - Decision: reclassify `S3` as `behavior` to preserve test-first slice cadence.

### Pass 2: Integration

- Checklist dependencies were updated so metadata mutator work depends on finalized service coercion semantics.
- Checklist/docs items were aligned with the locked no-pruning decision and warning-coercion contract.
- Behavior slice typing now matches execution semantics (`S1`, `S2`, and `S3` are all behavior slices).

### Pass 3: Sanity

- No blocking conflicts remain between plan scope, checklist steps, and current runtime architecture.
- Implementation may proceed under `docs/normative/implementation.md`.
