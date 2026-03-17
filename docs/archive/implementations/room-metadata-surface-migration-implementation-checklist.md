# Room Metadata Surface Migration Implementation Checklist

## Status

- Status: archived
- Scope: migrate room metadata mutator surface from `setRoomFlag` + `roomRef` targeting to metadata-native room operations scoped to current actor room
- Source: `docs/active/RoomMetadataSurfaceMigration-ImplementationPlan.md`
- Note: this checklist excludes tests/testing per `docs/normative/checklist.md`; test authoring/execution belongs to implementation phase.

## Checklist

- [x] [types] Replace `SetRoomFlagInstruction` with `SetRoomMetadataInstruction` in `bundles/bundle-rantamuta/lib/session/mutator.js`, including the `MutationInstruction` union update.
- [x] [mutator-write] Add `applySetRoomMetadataInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js` using actor-context room targeting (`instruction.actor.room`) instead of authored `roomRef`; missing actor-room context must throw (depends on previous item).
- [x] [mutator-write] Implement `setRoomMetadata` write semantics in `applySetRoomMetadataInstruction(...)` to match existing `set*Metadata` behavior: safe key/path validation policy, `value !== undefined`, JSON-safe values with `null` allowed, subtree-conflict rejection, and rollback/root-shape restoration without unrelated-write clobbering (depends on previous item).
- [x] [dispatch] Wire `setRoomMetadata` in `applyMutationInstruction(...)` and remove active `setRoomFlag` dispatch/handler usage in `bundles/bundle-rantamuta/lib/session/mutator.js` after migration callsites are updated (depends on previous two items).
- [x] [types] Update `DeleteRoomMetadataInstruction` in `bundles/bundle-rantamuta/lib/session/mutator.js` from `roomRef` targeting to actor-context targeting (`actor`, `key`, optional `force`) (depends on item 1).
- [x] [mutator-delete] Refactor `applyDeleteRoomMetadataInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js` to resolve room from `instruction.actor.room`, preserve existing key/force/delete-path behavior, keep rollback restoration semantics, and throw on missing actor-room context (depends on previous item).
- [x] [mutator-delete] Remove `deleteRoomMetadata.roomRef`-specific validation/error paths and align missing-room failure contract with actor-context targeting in `bundles/bundle-rantamuta/lib/session/mutator.js` (depends on previous item).
- [x] [content] Replace authored `setRoomFlag` operations in `bundles/bundle-rantamuta/areas/test/items.yml` with `setRoomMetadata` actor-context payloads.
- [x] [docs-manual] Update room metadata mutator references and examples in `docs/manuals/DesignerManual.md` from `setRoomFlag` to `setRoomMetadata`, and remove authored `roomRef` from room-scope mutation payload examples.
- [x] [docs-manual] Update room metadata mutator references in `docs/manuals/BundleRantamutaTechnicalManual.md` and `docs/manuals/Manual.md` to metadata-native room operation names and actor-context targeting.
- [x] [docs-plan] Align active proposal/plan language in `docs/active/ScopedFlagMutatorProposal.md` and `docs/active/RoomMetadataSurfaceMigration-ImplementationPlan.md` to the completed target state (no authored `roomRef` for room metadata ops).
- [x] [audit] Verify migration criteria with repository scans: no runtime/content/manual `setRoomFlag` references and no authored `roomRef` targeting for room metadata ops, while allowing historical references under `docs/archive/**` and planning references under `docs/active/**` and `docs/drafts/**`.

## Behavior Slices

- `S1`
  - Goal: replace room metadata write contract from `setRoomFlag` to actor-context `setRoomMetadata` in mutator types/dispatch/handler.
  - Items: checklist items 1, 2, 3, and 4.
  - Type: behavior
- `S2`
  - Goal: migrate room metadata delete contract to actor-context targeting.
  - Items: checklist items 5, 6, and 7.
  - Type: behavior
- `S3`
  - Goal: migrate authored content payloads to the new room metadata write operation.
  - Items: checklist item 8.
  - Type: behavior
- `S4`
  - Goal: align manuals and active planning docs with the migrated room metadata surface.
  - Items: checklist items 9, 10, and 11.
  - Type: mechanical
- `S5`
  - Goal: verify migration completion boundaries without treating historical/planning references as failures.
  - Items: checklist item 12.
  - Type: mechanical
