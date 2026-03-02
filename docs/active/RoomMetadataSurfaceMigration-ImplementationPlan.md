# Room Metadata Surface Migration Plan

## Status

- Status: `draft-v1`
- Type: implementation plan (not checklist)
- Scope: migrate room metadata mutator surface from `setRoomFlag` + `roomRef` targeting to metadata-native room operations

## Goal

Complete deferred room-scope API cleanup:

1. Replace `setRoomFlag` with `setRoomMetadata`.
2. Remove authored `roomRef` targeting from room-scope metadata mutator operations.

## Source Context

- `docs/drafts/ScopedFlagMutatorProposal.md` (Deferred Follow-up Task)
- `docs/archive/implementations/D2-MetadataQueryCompatibility-Plan.md`
- `docs/archive/implementations/D3-DeleteMetadataOps-Plan.md`
- `docs/normative/CommandArchitecture.md`
- `docs/normative/EntityResolution.md`

## Current State (Observed)

- `setRoomFlag` still exists in mutator runtime and docs.
- `setRoomFlag` currently requires `roomRef` and boolean-only value.
- Room authored content still uses `setRoomFlag` (for example `bundles/bundle-rantamuta/areas/test/items.yml`).
- `deleteRoomMetadata` currently requires `roomRef` (D3 locked for minimal change).

## Locked Migration Target

1. Author-facing room write op name becomes `setRoomMetadata`.
2. Author-facing room targeting uses current room authority (actor context), not authored `roomRef`.
3. Room metadata values live under `room.metadata.values`.
4. Predicate reads remain through `q.getRoomMetadata(...)`.

## Open Decision to Resolve Before Implementation

- Whether `deleteRoomMetadata` remains `roomRef`-targeted in this phase (as implemented in D3) or is migrated to actor-context in the same phase for symmetry.

## Implementation Scope

1. Mutator contracts:
   - Add `setRoomMetadata` instruction typedef and handler.
   - Remove or retire `setRoomFlag` from active mutator dispatch after callsite migration.
2. Targeting model:
   - Resolve room from actor context (`actor.room`) for author-facing room metadata operations.
   - Reject missing actor-room context.
3. Content/runtime migration:
   - Replace authored `setRoomFlag` operations in active content with `setRoomMetadata`.
   - Update tests from `setRoomFlag` to `setRoomMetadata` and actor-context payloads.
4. Documentation migration:
   - Update Designer and Technical manuals to remove `setRoomFlag` references.
   - Align proposal/docs language with metadata-native room surface.
5. Audit:
   - Verify zero active non-archive references to `setRoomFlag`.
   - Verify no active authored room metadata writes rely on authored `roomRef`.

## Risks

1. Runtime operations that do not have actor context may need explicit internal-only pathways.
2. In-flight plans/tests using `setRoomFlag` may fail until migrated in one pass.
3. If `deleteRoomMetadata` targeting is left unchanged, surface asymmetry must be explicitly documented.

## Validation

1. `rg -n "setRoomFlag" bundles docs -g '!docs/archive/**'`
2. `npx mocha bundles/bundle-rantamuta/tests/mutator.test.js`
3. `npm test`
4. `npm run ci:local` (or `--in-place` when appropriate)

