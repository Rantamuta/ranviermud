# SetWorldMetadata Implementation Checklist

## Status

- Status: draft
- Scope: implement `setWorldMetadata` mutator operation
- Source: `docs/active/SetWorldMetadata-ImplementationPlan.md`

## Checklist

- [ ] [contract] Add `SetWorldMetadataInstruction` typedef in `bundles/bundle-rantamuta/lib/session/mutator.js` with fields `type: 'setWorldMetadata'`, `key`, and `value`.
- [ ] [contract] Add `SetWorldMetadataInstruction` to `MutationInstruction` union in `bundles/bundle-rantamuta/lib/session/mutator.js` (depends on previous item).
- [ ] [service] Add a world metadata write-root accessor in `bundles/bundle-rantamuta/lib/session/world-metadata-service.js` that creates missing `state.metadata` / `state.metadata.values` objects.
- [ ] [service] In that accessor, coerce non-object `state.metadata` and non-object `state.metadata.values` to objects and emit warning-level logs with stable warning prefixes (depends on previous item).
- [ ] [metadata] Add `applySetWorldMetadataInstruction(state, instruction)` to `bundles/bundle-rantamuta/lib/session/mutator.js` (depends on first four items).
  - Implement key validation exactly aligned with `setAreaMetadata` segment rules.
- [ ] [metadata] In `applySetWorldMetadataInstruction(...)`, reject `value === undefined` and allow `null` as a storable value (depends on previous item).
- [ ] [metadata] In `applySetWorldMetadataInstruction(...)`, enforce JSON-safe value validation and deep-clone behavior aligned with `setAreaMetadata` (depends on previous item).
- [ ] [metadata] In `applySetWorldMetadataInstruction(...)`, enforce subtree/leaf conflict behavior aligned with `setAreaMetadata` (depends on previous item).
- [ ] [metadata] In `applySetWorldMetadataInstruction(...)`, implement rollback using re-resolve-safe restoration semantics (no stale parent object references) (depends on previous item).
- [ ] [metadata] In `applySetWorldMetadataInstruction(...)`, avoid automatic parent/root pruning behavior during apply/undo (depends on previous item).
  - Keep world metadata shape stable unless explicitly overwritten by an operation in the same plan.
- [ ] [dispatch] Register `setWorldMetadata` in `applyMutationInstruction(...)` dispatch in `bundles/bundle-rantamuta/lib/session/mutator.js` (depends on `applySetWorldMetadataInstruction(...)` item).
- [ ] [docs] Update `docs/manuals/DesignerManual.md` with `setWorldMetadata` contract: key semantics, `null` allowed, `undefined` rejected, and world-root creation/coercion warning behavior (depends on dispatch item).
- [ ] [docs] Update `docs/manuals/BundleRantamutaTechnicalManual.md` with commit-phase ownership, rollback semantics, no-pruning behavior for `setWorldMetadata`, and warning-level coercion notes (depends on dispatch item).
- [ ] [docs-normative] Confirm whether any normative file requires update for `setWorldMetadata`; if not, add explicit no-change rationale to checklist execution notes (depends on docs items).
- [ ] [audit] Verify active non-archive docs/runtime references for world metadata write semantics are consistent with this implementation scope (depends on docs-normative item).

## Behavior Slices

- `S1`
  - Goal: establish `setWorldMetadata` instruction contract and world write-root service semantics.
  - Items: checklist items 1, 2, 3, and 4.
  - Type: behavior
- `S2`
  - Goal: implement mutator apply/rollback semantics for `setWorldMetadata` aligned with existing metadata rules.
  - Items: checklist items 5, 6, 7, 8, 9, and 10.
  - Type: behavior
- `S3`
  - Goal: wire dispatch and align manuals/normative posture for the new world write operation.
  - Items: checklist items 11, 12, 13, 14, and 15.
  - Type: behavior
