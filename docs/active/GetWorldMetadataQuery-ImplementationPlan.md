# GetWorldMetadata Query Implementation Plan

## Status

- Status: `draft-v2`
- Type: implementation plan (not checklist)
- Scope: add predicate query helper `q.getWorldMetadata(...)`

## Goal

Expose world metadata read access through predicate query facade without adding any mutation behavior to render/predicate phases.

## Source Context

- `docs/drafts/ScopedFlagMutatorProposal.md`
- `docs/archive/implementations/D2-MetadataQueryCompatibility-Plan.md`
- `docs/normative/PredicateStateRendering.md`
- `docs/normative/CommandArchitecture.md`

## Current State (Observed)

- Query facade currently includes `q.getRoomMetadata(...)` and `q.getAreaMetadata(...)`.
- `readMetadataValue(...)` already provides metadata.values dot-path traversal with case-insensitive segment matching.
- `q.getWorldMetadata(...)` is not present.

## Locked Decisions

1. `q.getWorldMetadata(key)` is read-only and must not mutate world state.
2. Read semantics match existing metadata queries:
   - read from `metadata.values`,
   - missing path => `undefined`,
   - case-insensitive segment matching,
   - collision behavior follows existing warn-once + last-match policy.
   - invalid or unparseable key input => `undefined` (no throw).
3. No fallback to `metadata.flags`.
4. Missing world context is non-fatal and query-safe:
   - if `world` is missing, return `undefined`,
   - if `world.metadata` is missing/non-object, return `undefined`,
   - if `world.metadata.values` is missing/non-object, return `undefined`.
5. Collision diagnostics use a stable world-specific warning code aligned with existing room/area query warnings:
   - `PREDICATE_QUERY_METADATA_KEY_COLLISION:getWorldMetadata:world:<lowercased-path-label>`

## Implementation Scope

1. Predicate runtime query facade:
   - Add `getWorldMetadata` to facade contract in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`.
   - Resolve source metadata from world context already provided to runtime.
2. Query warning diagnostics:
   - Add world-specific collision warning code path aligned with room/area patterns.
3. Tests:
   - Extend `bundles/bundle-rantamuta/tests/predicate.runtime.test.js` for:
     - successful reads,
     - missing-path `undefined`,
     - case-insensitive access,
     - collision warning behavior.
4. Docs:
   - Update `docs/manuals/DesignerManual.md` query list/examples.
   - Update `docs/manuals/BundleRantamutaTechnicalManual.md` query facade section.
   - Update `docs/normative/PredicateStateRendering.md` allowed `q` method list to include `q.getWorldMetadata(key)` (required).

## Dependencies

- Prefer implementing after or alongside `setWorldMetadata` so write/read surfaces align.

## Out of Scope

- New mutation operations.
- World metadata persistence policy changes.

## Validation

1. `npx mocha bundles/bundle-rantamuta/tests/predicate.runtime.test.js`
2. `npm test`
3. `npm run ci:local` (or `--in-place` when appropriate)

## Checklist Review Passes

### Pass 1: Quality Control

- QC-1 Issue: world collision warning code format was described as "stable pattern" but not explicitly locked.
  - Decision: lock exact world collision warning code format in this plan and in checklist items.
- QC-2 Issue: invalid/unparseable key behavior was implied via shared reader semantics but not explicitly locked for `q.getWorldMetadata(key)`.
  - Decision: lock invalid/unparseable key behavior as `undefined` (no throw), consistent with existing metadata query behavior.
- QC-3 Issue: possible over-consolidation of checklist items could reduce traceability to plan clauses.
  - Decision: keep existing atomic checklist granularity (no merge), since each item maps directly to one scoped behavior clause.

### Pass 2: Integration

- Checklist was updated to include the exact warning code format and explicit invalid-key no-throw behavior.
- Behavior slices remain aligned with scope ownership:
  - `S1`: runtime query facade + diagnostics behavior.
  - `S2`: docs and normative method-list alignment.
  - `S3`: post-change alignment audit.

### Pass 3: Sanity

- No blockers remain for implementation.
- Scope remains constrained to read-only predicate query surface and documentation alignment.
