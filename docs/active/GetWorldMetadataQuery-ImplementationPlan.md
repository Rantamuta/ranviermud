# GetWorldMetadata Query Implementation Plan

## Status

- Status: `draft-v1`
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
3. No fallback to `metadata.flags`.

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
   - Update `docs/normative/PredicateStateRendering.md` method list if needed.

## Dependencies

- Prefer implementing after or alongside `setWorldMetadata` so write/read surfaces align.

## Out of Scope

- New mutation operations.
- World metadata persistence policy changes.

## Validation

1. `npx mocha bundles/bundle-rantamuta/tests/predicate.runtime.test.js`
2. `npm test`
3. `npm run ci:local` (or `--in-place` when appropriate)

