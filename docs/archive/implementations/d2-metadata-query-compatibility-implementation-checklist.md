# D2 Metadata Query Compatibility Implementation Checklist

## Status

- Status: archived
- Scope: execute D2 migration from legacy `q.*Flag`/`metadata.flags` to `q.get*Metadata`/`metadata.values`
- Source: `docs/drafts/D2-MetadataQueryCompatibility-Plan.md`

## Checklist

- [x] [discovery] Run an intentional repository search for case-collision metadata paths (same logical path with different casing) across runtime and authored content, and record findings in D2 planning notes.
  - Result recorded: no case-collision groups found in scanned runtime/content/test key literals and authored metadata paths.
- [x] [runtime-query] Add a case-insensitive metadata segment resolver in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` that preserves authored key casing while traversing `metadata.values`.
- [x] [runtime-query] Update `readMetadataValue(...)` in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` to use case-insensitive segment resolution for all path segments while preserving current read-only behavior (`undefined` on missing/non-object traversal).
- [x] [runtime-query] Add collision handling in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`: when multiple sibling keys match a segment case-insensitively, emit a non-fatal warning and continue with the last matched key/value.
  - Depends on previous two checklist items.
- [x] [runtime-facade] Remove `q.roomFlag(...)` and `q.areaFlag(...)` from `createQueryFacade(...)` in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`, including facade type annotations and any helper code used only by those APIs.
- [x] [runtime-mutation] Update `applySetRoomFlagInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js` so it no longer reads/writes/restores `metadata.flags` and only writes to `metadata.values` in this D2 scope.
- [x] [content] Replace `q.roomFlag(...)` and `q.areaFlag(...)` usages in `bundles/bundle-rantamuta/areas/test/predicates.js` with equivalent `q.getRoomMetadata(...)` / `q.getAreaMetadata(...)` boolean reads (`=== true` where strict boolean semantics are required).
- [x] [content] Replace `q.roomFlag(...)` and `q.areaFlag(...)` usages in `bundles/bundle-rantamuta/areas/codex/predicates.js` with equivalent `q.getRoomMetadata(...)` / `q.getAreaMetadata(...)` boolean reads.
- [x] [data-migration] Migrate authored bundle metadata from `metadata.flags` to `metadata.values` in `bundles/bundle-rantamuta/areas/codex/manifest.yml`, `bundles/bundle-rantamuta/areas/codex/rooms.yml`, `bundles/bundle-rantamuta/areas/test/manifest.yml`, and `bundles/bundle-rantamuta/areas/test/rooms.yml`, preserving existing keys and values.
- [x] [docs-manual] Update `docs/manuals/DesignerManual.md` to remove `q.roomFlag(...)` / `q.areaFlag(...)` guidance and document boolean reads via `q.get*Metadata(...)` plus the case-insensitive read convention (authored-case write preservation).
- [x] [docs-technical] Update `docs/manuals/BundleRantamutaTechnicalManual.md` to remove legacy `metadata.flags` and `q.*Flag` compatibility guidance and document `metadata.values` + `q.get*Metadata(...)` as the canonical contract.
- [x] [docs-normative] Update `docs/normative/PredicateStateRendering.md` so predicate query documentation no longer lists `q.roomFlag(...)` / `q.areaFlag(...)` and no longer defines `metadata.flags` as active query state.
- [x] [docs-drafts] Update active draft docs that still describe transitional `q.*Flag` / `metadata.flags` behavior (for example `docs/drafts/ScopedFlagMutatorProposal.md`) so D2 documentation posture is internally consistent.
- [x] [audit] Remove or update remaining active (non-archive) references to `q.roomFlag`, `q.areaFlag`, and `metadata.flags` across runtime, content, docs, and active tests; record any explicitly deferred references in D2 planning notes.

## Behavior Slices

- `S1`
  - Goal: establish D2 read-path behavior for case-insensitive metadata traversal with deterministic collision handling.
  - Items: checklist items 1, 2, 3, and 4.
  - Type: behavior
- `S2`
  - Goal: remove legacy runtime `q.*Flag` and `metadata.flags` behavior from query and mutation layers.
  - Items: checklist items 5 and 6.
  - Type: behavior
- `S3`
  - Goal: migrate authored bundle content and area metadata storage usage to `q.get*Metadata` and `metadata.values`.
  - Items: checklist items 7, 8, and 9.
  - Type: behavior
- `S4`
  - Goal: align manuals, normative documentation, and active references with the D2 canonical metadata API/state model.
  - Items: checklist items 10, 11, 12, 13, and 14.
  - Type: mechanical
