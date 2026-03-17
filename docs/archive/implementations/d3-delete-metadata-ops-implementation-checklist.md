# D3 Delete Metadata Ops Implementation Checklist

## Status

- Status: archived
- Scope: implement explicit metadata delete operations for room/area/world scopes
- Source: `docs/drafts/D3-DeleteMetadataOps-Plan.md`

## Checklist

- [x] [contract] Add delete instruction typedefs in `bundles/bundle-rantamuta/lib/session/mutator.js`:
  - `deleteRoomMetadata` with `roomRef`, `key`, optional `force`.
  - `deleteAreaMetadata` with `actor`, `key`, optional `force`.
  - `deleteWorldMetadata` with `key`, optional `force`.
- [x] [contract] Add the new delete instruction types to the `MutationInstruction` union in `bundles/bundle-rantamuta/lib/session/mutator.js`.
- [x] [metadata] Add shared metadata delete helpers in `bundles/bundle-rantamuta/lib/session/mutator.js`:
  - path validation aligned with metadata set path rules,
  - missing-path idempotent no-op,
  - default leaf-only delete,
  - non-leaf delete throws unless `force: true`,
  - no automatic parent/root pruning.
- [x] [metadata] Enforce `force` contract: when authored, it must be boolean; only literal `true` enables non-leaf delete.
- [x] [metadata] Ensure rollback payloads for deleted leaves/subtrees are deep JSON-safe snapshots so undo restores original value shape without aliasing.
- [x] [room] Implement `applyDeleteRoomMetadataInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js` using explicit `roomRef` authority and deleting within `room.metadata.values`.
- [x] [area] Implement `applyDeleteAreaMetadataInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js` using actor-context authority (`actor.room.area`) and deleting within `area.metadata.values`.
- [x] [world] Add `bundles/bundle-rantamuta/lib/session/world-metadata-service.js` with world-scoped metadata root access and delete helpers.
- [x] [world] Ensure world metadata service supports non-creating root reads so missing-root world deletes no-op without creating world metadata state.
- [x] [world] Implement `applyDeleteWorldMetadataInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js` using world metadata service with missing root/path no-op semantics.
- [x] [dispatch] Register `deleteRoomMetadata`, `deleteAreaMetadata`, and `deleteWorldMetadata` in `applyMutationInstruction(...)` dispatch in `bundles/bundle-rantamuta/lib/session/mutator.js`.
- [x] [tests] Add mutator tests in `bundles/bundle-rantamuta/tests/mutator.test.js` for shared delete semantics:
  - leaf delete success,
  - missing-path no-op,
  - non-leaf delete throws by default,
  - `force: true` non-leaf delete success,
  - rollback restoration of deleted values,
  - no automatic parent/root pruning.
- [x] [tests] Add world-scope tests in `bundles/bundle-rantamuta/tests/mutator.test.js` verifying:
  - delete missing world root/path is no-op,
  - delete existing world metadata key works,
  - rollback restores deleted world value,
  - no-op world delete does not create world metadata root.
- [x] [docs-manual] Update `docs/manuals/DesignerManual.md` to document the three delete operations, `roomRef`/actor target authority, default leaf-only behavior, `force: true` override semantics, and missing-path no-op behavior.
- [x] [docs-technical] Update `docs/manuals/BundleRantamutaTechnicalManual.md` to document mutator-phase ownership, rollback rules, world no-root-create no-op behavior, and explicit no-pruning behavior for D3 deletes.
- [x] [docs-normative] Confirm whether normative docs require update for D3 delete semantics; if yes, update affected files; if no, record explicit no-change rationale in checklist execution notes.
- [x] [docs-drafts] Update active draft docs (including `docs/drafts/ScopedFlagMutatorProposal.md`) so delete-world sequencing matches D3 decisions and `q.getWorldMetadata(...)` remains deferred.
- [x] [audit] Audit active (non-archive) runtime/content/docs for D3 consistency: delete operations live only in mutator commit flow, render/predicate flow remains read-only, and no docs describe parent/root pruning as default.

## Behavior Slices

- `S1`
  - Goal: establish delete contracts and shared delete semantics (leaf-only default + strict `force` override + snapshot-safe undo payloads).
  - Items: checklist items 1, 2, 3, 4, 5, and 12.
  - Type: behavior
- `S2`
  - Goal: implement room/area delete instruction handlers and dispatch wiring.
  - Items: checklist items 6, 7, and 11.
  - Type: behavior
- `S3`
  - Goal: implement world metadata service and world delete handler with no-root-create no-op behavior.
  - Items: checklist items 8, 9, 10, and 13.
  - Type: behavior
- `S4`
  - Goal: align manuals/normative/drafts and close D3 scope with consistency audit notes.
  - Items: checklist items 14, 15, 16, 17, and 18.
  - Type: mechanical

## Execution Notes

- Normative update decision:
  - No normative file changes required for D3.
  - Rationale: D3 adds mutator-commit delete instructions only; it does not alter predicate/render read-only guarantees in `docs/normative/PredicateStateRendering.md` or command-phase invariants.
- D3 audit result:
  - `delete*Metadata` operations are implemented only in mutator commit flow (`lib/session/mutator.js`) plus world metadata helper (`lib/session/world-metadata-service.js`).
  - No render-time or predicate-time metadata mutation paths were introduced.
  - Docs describe no-pruning as non-default and `force: true` as explicit non-leaf override.
