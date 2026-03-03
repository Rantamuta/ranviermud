# GetWorldMetadata Query Implementation Checklist

## Status

- Status: complete
- Scope: implement predicate query helper `q.getWorldMetadata(...)`
- Source: `docs/active/GetWorldMetadataQuery-ImplementationPlan.md`
- Note: test steps are intentionally excluded here per `docs/normative/checklist.md`; test scope remains unchanged in the implementation plan for execution phase.

## Checklist

- [x] [facade-contract] Add `getWorldMetadata: (key: string) => *` to the `createQueryFacade(...)` return contract in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`.
- [x] [facade-read] Add `getWorldMetadata(key)` implementation to `createQueryFacade(...)` in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` that resolves metadata from `scope.world` (depends on previous item).
- [x] [facade-read] Ensure `getWorldMetadata(key)` reads only `world.metadata.values` via existing `readMetadataValue(...)` semantics (depends on previous item).
  - Missing `world`, missing/non-object `world.metadata`, missing/non-object `world.metadata.values`, or missing path must return `undefined` (no throw).
- [x] [facade-read] Ensure invalid/unparseable `key` input for `getWorldMetadata(key)` returns `undefined` (no throw), aligned with existing metadata query readers (depends on previous item).
- [x] [facade-read] Ensure `getWorldMetadata(key)` does not read or fallback to `metadata.flags` (depends on previous item).
- [x] [diagnostics] Add world-specific metadata key-collision warning handling for `getWorldMetadata(key)` aligned with existing room/area warn-once + last-match behavior in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` (depends on previous item).
  - Use warning code format: `PREDICATE_QUERY_METADATA_KEY_COLLISION:getWorldMetadata:world:<lowercased-path-label>`.
- [x] [docs] Update query list/examples in `docs/manuals/DesignerManual.md` to include `q.getWorldMetadata(key)` semantics (depends on diagnostics item).
- [x] [docs] Update query facade section in `docs/manuals/BundleRantamutaTechnicalManual.md` to include `q.getWorldMetadata(key)` semantics (depends on diagnostics item).
- [x] [docs-normative] Update `docs/normative/PredicateStateRendering.md` allowed `q` method list to include `q.getWorldMetadata(key)` (depends on docs items).
- [x] [audit] Verify active runtime/docs references for world metadata query behavior are consistent with locked plan decisions: read-only query surface, `undefined` for missing world/path and invalid key, case-insensitive lookup, warn-once collision diagnostics, and no `metadata.flags` fallback (depends on docs-normative item).

## Behavior Slices

- `S1`
  - Goal: add `q.getWorldMetadata(key)` to runtime facade with locked read semantics and diagnostics.
  - Items: checklist items 1, 2, 3, 4, 5, and 6.
  - Type: behavior
- `S2`
  - Goal: align manuals and normative method list with the new world query surface.
  - Items: checklist items 7, 8, and 9.
  - Type: mechanical
- `S3`
  - Goal: verify active runtime/docs surfaces are aligned with locked world-query decisions.
  - Items: checklist item 10.
  - Type: mechanical
