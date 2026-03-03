# Metadata Flags/Values Alignment Checklist (D1)

- [x] [char-tests] Add characterization tests in `bundles/bundle-rantamuta/tests/mutator.test.js` and `bundles/bundle-rantamuta/tests/predicate.runtime.test.js` that lock in current split behavior (`setRoomFlag` writes `metadata.flags`, `q.roomFlag/q.areaFlag` read `metadata.flags`, and `q.getRoomMetadata/q.getAreaMetadata` read `metadata.values`) without introducing new key-shape enforcement.
- [x] [policy] Record explicit D1 target state in `docs/drafts/ScopedFlagMutatorProposal.md`: `metadata.values` is canonical for metadata values, while `metadata.flags` remains legacy compatibility storage during transition.
- [x] [mutator-room] Update `applySetRoomFlagInstruction(...)` in `bundles/bundle-rantamuta/lib/session/mutator.js` to keep `setRoomFlag` behavior stable while writing a compatible boolean value into both namespaces (`metadata.values` and `metadata.flags`) with transactional rollback restoring both roots; preserve the current `setRoomFlag` input contract and do not introduce stricter key-shape validation in this D1 scope (depends on items 1 and 2).
- [x] [mutator-room] In `applySetRoomFlagInstruction(...)`, enforce deterministic rollback + root cleanup for both namespaces (remove empty created objects and restore previous shape exactly) so plan rollback remains invariant-safe (depends on item 3).
- [x] [predicate-compat] Update `q.roomFlag(...)` and `q.areaFlag(...)` in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` to read compatibility values from `metadata.values` first using non-enforcing key resolution (no new key-shape validator in this D1 scope), then fallback to legacy `metadata.flags`, preserving strict boolean semantics (`=== true`) and non-mutating query behavior (depends on items 1 and 2).
- [x] [predicate-compat] Add explicit conflict precedence tests in `bundles/bundle-rantamuta/tests/predicate.runtime.test.js` for keys present in both namespaces, including `true`, `false`, and non-boolean values, and lock the selected precedence contract (depends on item 5).
- [x] [integration] Add integration tests in `bundles/bundle-rantamuta/tests/mutator.test.js` covering `setRoomFlag` + `q.roomFlag/q.getRoomMetadata` interplay to prove cross-namespace compatibility during the transition window (depends on items 3, 4, and 5).
- [x] [docs] Update `docs/manuals/DesignerManual.md` to document transitional compatibility: `q.roomFlag/q.areaFlag` remain legacy-named boolean helpers, while metadata values are canonical under `metadata.values` and accessed via `q.getRoomMetadata/q.getAreaMetadata`; key naming remains a convention (camelCase recommended), not a hard validator in this D1 scope (depends on item 5).
- [x] [audit] Audit bundle-authored content and tests for direct assumptions about `metadata.flags` shape (`bundles/bundle-rantamuta/areas/**`, `bundles/bundle-rantamuta/tests/**`) and either update references or record intentional legacy uses in a follow-up note (depends on items 3 and 5).

## Behavior Slices

- `S1`
  - Goal: characterize current behavior and lock migration target policy.
  - Items: checklist items 1 and 2.
  - Type: behavior
- `S2`
  - Goal: make `setRoomFlag` transition-safe by synchronizing writes/rollback across `metadata.flags` and `metadata.values`.
  - Items: checklist items 3 and 4.
  - Type: behavior
- `S3`
  - Goal: align boolean query helpers with canonical metadata reads while preserving legacy helper names and strict boolean semantics.
  - Items: checklist items 5 and 6.
  - Type: behavior
- `S4`
  - Goal: prove end-to-end compatibility and document transition expectations.
  - Items: checklist items 7, 8, and 9.
  - Type: behavior

## Deferred Issues

- `D1b`
  - Issue: long-term removal of legacy `metadata.flags` storage is out of scope for this checklist.
  - Decision: execute D1 compatibility alignment first, then schedule a separate cleanup checklist for legacy namespace retirement after content/tests are migrated.

## Pass Notes

- `R1` (consistency pass): clarified that D1 must not introduce stricter key-shape validation in `setRoomFlag` while adding dual-write compatibility behavior.
- `I1` (integration pass): clarified `q.roomFlag(...)` / `q.areaFlag(...)` migration wording so compatibility reads from `metadata.values` do not imply new hard key-shape validators in this phase.

## Audit Findings

- Intentional legacy authored `metadata.flags` usage remains in area YAML:
  - `bundles/bundle-rantamuta/areas/codex/manifest.yml`
  - `bundles/bundle-rantamuta/areas/codex/rooms.yml`
  - `bundles/bundle-rantamuta/areas/test/manifest.yml`
  - `bundles/bundle-rantamuta/areas/test/rooms.yml`
- Intentional legacy boolean helper usage remains in area predicates:
  - `bundles/bundle-rantamuta/areas/codex/predicates.js`
  - `bundles/bundle-rantamuta/areas/test/predicates.js`
- Test suite retains explicit coverage for both legacy and compatibility behavior (`q.roomFlag/q.areaFlag` and `q.getRoomMetadata/q.getAreaMetadata`).
