# SetAreaMetadata Implementation Checklist

- [x] [mutator-contract] Add `SetAreaMetadataInstruction` typedef to `bundles/bundle-rantamuta/lib/session/mutator.js` and include it in the `MutationInstruction` union with fields `{ type: 'setAreaMetadata', actor, key, value }`, where `key` is a safe dot path and `value` is JSON-safe except `undefined` (`null` allowed).
- [x] [mutator-apply] Add `applySetAreaMetadataInstruction(instruction)` in `bundles/bundle-rantamuta/lib/session/mutator.js` that resolves the target area from `instruction.actor.room.area` only and throws on missing/invalid actor room context (depends on previous item).
- [x] [mutator-apply] In `applySetAreaMetadataInstruction`, parse and validate `key` with strict metadata-key syntax (`.`-separated camelCase segments; no whitespace; segment characters `[A-Za-z0-9]` only), and throw `SyntaxError` for invalid input (depends on previous item).
- [x] [mutator-apply] In `applySetAreaMetadataInstruction`, implement reversible write semantics for `area.metadata.values[key]` at dot path depth, including creation of missing intermediate objects and undo restoration of created/previous structures (depends on previous item).
- [x] [mutator-apply] In `applySetAreaMetadataInstruction`, throw a mutator error for subtree-conflict writes (for example existing `foo.bar.baz` and attempted set of `foo`), non-object intermediate segments, and non-object `metadata.values` roots; do not warn+noop (depends on previous item).
- [x] [mutator-apply] In `applySetAreaMetadataInstruction`, reject `value === undefined`, allow `null`, and enforce JSON-safe value handling with snapshot/clone-on-write semantics for object/array values so rollback is deterministic and not affected by external reference mutation (depends on previous item).
- [x] [mutator-dispatch] Register `setAreaMetadata` in `applyMutationInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js` so commit can execute the new operation (depends on items 1-8).
- [x] [predicate-api] Add `q.getAreaMetadata(areaRef, key)` in `createQueryFacade(...)` in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` to read `area.metadata.values` by the same camelCase dot-path rules without mutating state, returning `undefined` for missing paths while preserving stored `null`/`false`/`0` values.
- [x] [predicate-api] Add `q.getRoomMetadata(roomRef, key)` in `createQueryFacade(...)` in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` to read `room.metadata.values` by the same camelCase dot-path rules without mutating state, returning `undefined` for missing paths while preserving stored `null`/`false`/`0` values.
- [x] [docs] Update mutation documentation in `docs/manuals/DesignerManual.md` to add `setAreaMetadata` with current-area-only semantics (no authored `areaRef`), dot-path key examples, and explicit subtree-conflict error behavior.
- [x] [docs] Add a caution note in `docs/manuals/DesignerManual.md` that `setAreaMetadata` resolves target area from actor context at commit-time, so operation ordering (for example move then set) determines which area is written.
- [x] [docs] Update predicate query documentation in `docs/manuals/DesignerManual.md` to document `q.getRoomMetadata(...)` and `q.getAreaMetadata(...)`, including camelCase dot-path syntax and `undefined` for missing values.

## Behavior Slices

- `S1`
  - Goal: add `setAreaMetadata` commit-path support with current-area-only targeting and rollback-safe writes.
  - Items: checklist items 1, 2, 3, 4, 5, 6, 7, 8, and 9.
  - Type: behavior
- `S2`
  - Goal: add metadata-value query helpers for room/area read access.
  - Items: checklist items 10 and 11.
  - Type: behavior
- `S3`
  - Goal: align design docs and proposal notes with the new `setAreaMetadata` contract.
  - Items: checklist items 12, 13, and 14.
  - Type: mechanical

## Deferred Issues

- `D1`
  - Issue: legacy metadata currently lives under `metadata.flags`, while this checklist introduces new writes under `metadata.values`.
  - Decision: proceed with current implementation scope and treat cross-namespace migration/backfill as follow-up work.
- `D2`
  - Issue: legacy helpers `q.areaFlag(...)` and `q.roomFlag(...)` remain unchanged in this checklist scope.
  - Decision: defer any delegation/rename compatibility work for those helpers to a separate follow-up task.
- `D3`
  - Issue: proposal includes `deleteAreaMetadata` and `deleteWorldMetadata` operations, but this checklist intentionally scopes only `setAreaMetadata`.
  - Decision: schedule delete-operation implementation as a separate follow-up checklist.
