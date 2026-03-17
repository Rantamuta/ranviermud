# Room Metadata Surface Migration Plan

## Status

- Status: archived
- Type: implementation plan (not checklist)
- Scope: migrate room metadata mutator surface from `setRoomFlag` + `roomRef` targeting to metadata-native room operations scoped to current actor room

## Goal

Complete deferred room-scope API cleanup:

1. Replace `setRoomFlag` with `setRoomMetadata`.
2. Remove authored `roomRef` targeting from room-scope metadata mutator operations (`setRoomMetadata` and `deleteRoomMetadata`).

## Source Context

- [`ScopedFlagMutatorProposal.md`](./ScopedFlagMutatorProposal.md)
- `docs/archive/implementations/D2-MetadataQueryCompatibility-Plan.md`
- `docs/archive/implementations/D3-DeleteMetadataOps-Plan.md`
- `docs/normative/CommandArchitecture.md`
- `docs/normative/EntityResolution.md`

## Pre-Migration Baseline (Archived Context)

- `setRoomFlag` still exists in mutator runtime and docs.
- `setRoomFlag` currently requires `roomRef` and boolean-only value.
- Room authored content still uses `setRoomFlag` (for example `bundles/bundle-rantamuta/areas/test/items.yml`).
- `deleteRoomMetadata` currently requires `roomRef` (D3 locked for minimal change).

## Implementation Outcome

1. `setRoomMetadata` is the active room metadata write op.
2. Room metadata mutator ops (`setRoomMetadata`, `deleteRoomMetadata`) resolve room from actor context and do not use authored `roomRef`.
3. Active content/manual references were migrated away from `setRoomFlag`.

## Locked Migration Target

1. Author-facing room write op name becomes `setRoomMetadata`.
2. Author-facing room metadata ops use current room authority (actor context), not authored `roomRef`.
   - Applies to both `setRoomMetadata` and `deleteRoomMetadata`.
3. Room metadata values live under `room.metadata.values`.
4. Predicate reads remain through `q.getRoomMetadata(...)`.
5. `setRoomMetadata` follows the same metadata write semantics as other `set*Metadata` ops:
   - key/path validation follows the same metadata-path safety policy used by existing `set*Metadata`,
   - `value` rejects `undefined`, allows `null`, and must be JSON-safe,
   - subtree-conflict writes reject,
   - rollback restores prior value/root shape without clobbering unrelated writes.

## Implementation Scope

1. Mutator contracts:
   - Add `setRoomMetadata` instruction typedef and handler.
   - Migrate `deleteRoomMetadata` instruction typedef/handler from `roomRef` targeting to actor-context room targeting.
   - Remove or retire `setRoomFlag` from active mutator dispatch after callsite migration.
2. Targeting model:
   - Resolve room from actor context (`actor.room`) for author-facing room metadata operations.
   - Reject missing actor-room context.
3. Content/runtime migration:
   - Replace authored `setRoomFlag` operations in active content with `setRoomMetadata`.
   - Update tests from `setRoomFlag` to `setRoomMetadata` and actor-context payloads.
4. Documentation migration:
   - Update designer/runtime manuals to remove `setRoomFlag` references and replace with `setRoomMetadata`.
   - Include manual coverage in `docs/manuals/DesignerManual.md`, `docs/manuals/BundleRantamutaTechnicalManual.md`, and `docs/manuals/Manual.md`.
   - Align proposal/docs language with metadata-native room surface.
5. Audit:
   - Verify zero runtime/content/manual references to `setRoomFlag` outside historical/plan docs.
   - Keep historical references in `docs/archive/**` and planning references in `docs/active/**`/`docs/drafts/**` out of migration-failure criteria.
   - Verify no active authored room metadata writes rely on authored `roomRef`.

## Risks

1. Runtime operations that do not have actor context may need explicit internal-only pathways.
2. In-flight plans/tests using `setRoomFlag` may fail until migrated in one pass.

## Validation

1. `rg -n "setRoomFlag" bundles/bundle-rantamuta docs/manuals`
2. `rg -n "type:\\s*setRoomFlag|type:\\s*'setRoomFlag'|type:\\s*deleteRoomMetadata|type:\\s*'deleteRoomMetadata'" bundles/bundle-rantamuta/areas bundles/bundle-rantamuta/tests`
   - Then confirm migrated `deleteRoomMetadata` payloads are actor-context scoped (no authored `roomRef` field).
3. `npx mocha bundles/bundle-rantamuta/tests/mutator.test.js`
4. `npm test`
5. `npm run ci:local` (or `--in-place` when appropriate)
