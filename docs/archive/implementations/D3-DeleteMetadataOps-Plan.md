# D3 Delete Metadata Ops Plan (Draft)

## Status

- Status: archived
- Type: decision-locked plan (not implementation checklist)
- Scope: explicit metadata delete operation design and rollout sequencing

## Goal

Define the framework contract for explicit delete operations:

- `deleteRoomMetadata`
- `deleteAreaMetadata`
- `deleteWorldMetadata`

with deterministic rollback, clear command-phase ownership, and no hidden persistence behavior.

## Current State (Observed)

- `setAreaMetadata` exists and stores values (including `null`) in `area.metadata.values`.
- Delete operations are not implemented yet.
- `setWorldMetadata` is not implemented in runtime yet.
- `q.getWorldMetadata(...)` is not implemented in runtime yet.

## Locked Decisions

1. Operation set for D3:
- Implement `deleteRoomMetadata`, `deleteAreaMetadata`, and `deleteWorldMetadata` now.
- Keep NPC/item metadata deletes out of this phase.

2. Target and path behavior:
- `deleteRoomMetadata` targets room metadata values scope using explicit `roomRef` targeting in D3 (minimal-change parity with current room-scoped mutators).
- `deleteAreaMetadata` targets current-area `area.metadata.values` via actor context (`actor.room.area`) in D3.
- `deleteWorldMetadata` targets world metadata store scope.
- Key/path resolution follows the same safe dot-path rules used by metadata set operations.

3. Missing path behavior:
- Missing path delete is idempotent no-op.
- No warning and no error for missing path deletes.

4. Non-leaf (parent/object) delete behavior:
- Default delete does not allow deleting parent/object/array nodes.
- Default behavior throws on non-leaf targets.
- Explicit override is `force: true` (preferred over `recursive` for designer readability).
- `force` is optional and must be a boolean when present; only literal `true` enables parent/object/array delete.

5. World delete sequencing:
- `deleteWorldMetadata` ships in D3 even though `setWorldMetadata` is not yet implemented.
- If world metadata store/path does not exist, delete is no-op (not throw).

6. API/read-path scope for D3:
- `q.getWorldMetadata(...)` is deferred and not part of this phase.

7. Rollback and shape rules:
- Delete operations must return inverse operations in mutator commit flow.
- Rollback restores deleted leaf value when it existed.
- Rollback for missing-path deletes is noop.
- No automatic parent/root pruning in delete operations for D3.
- Rollback snapshots for deleted values (including forced subtree deletes) are deep-cloned JSON-safe snapshots.

9. World-store creation behavior:
- `deleteWorldMetadata` must not initialize/create world metadata root during a missing-root no-op delete.
- A missing world metadata root remains absent after a no-op delete.

8. Null guidance posture:
- `null` remains currently allowed as metadata data value.
- D3 docs should focus on explicit delete semantics and avoid expanding designer-facing `null` guidance in this phase.

## Root Pruning Note

"Root pruning" means removing now-empty parent objects (and potentially higher ancestors) after deleting a leaf key.

Example concept:
- Delete `story.arc.phase`
- Then also remove empty `story.arc`
- Then maybe remove empty `story`

D3 decision:
- Do not perform automatic parent/root pruning.
- This avoids accidental shape-coupling and sibling clobber risks.
- Keep delete behavior leaf-focused and rollback-simple for this phase.

## Risks to Watch

- Delete-parent override (`force: true`) used too broadly without author intent.
- Partial world-scope implementation introducing future migration friction.
- Rollback edge cases if delete path resolution diverges from set path resolution.
- Ambiguity between `null` as data vs delete as operation leading to authored confusion.

## Pass Notes

### Pass 1: Quality Control (Glaring Issues)

1. Issue: `deleteRoomMetadata` target authority was underspecified (roomRef vs actor-context).
- Decision: lock D3 to explicit `roomRef` for room deletes and actor-context for area deletes.

2. Issue: world delete could accidentally create metadata root while handling no-op deletes.
- Decision: require non-creating world root lookup for missing-root no-op semantics.

3. Issue: override semantics for `force` were not strict enough.
- Decision: enforce boolean typing for `force`; only literal `true` enables non-leaf delete.

4. Issue: checklist lacked explicit test obligations for non-leaf deletes, force deletes, and rollback restoration.
- Decision: checklist must include test tasks that cover leaf delete, missing-path no-op, non-leaf throw, force delete, rollback restoration, and no-pruning behavior across room/area/world scopes.

### Pass 2: Integration

- Checklist must explicitly mirror the target-authority and world-root-no-create decisions.
- Checklist behavior slices must include concrete test tasks before implementation tasks.
- Checklist docs tasks must explicitly reflect that `q.getWorldMetadata(...)` is deferred in D3.

### Pass 3: Sanity

- No blockers remain after locking the above decisions.
- D3 implementation can proceed under `docs/normative/implementation.md` with test-first slices.

## Implementation Notes

- Implemented D3 delete ops:
  - `deleteRoomMetadata` (explicit `roomRef` authority)
  - `deleteAreaMetadata` (actor-context area authority)
  - `deleteWorldMetadata` (world-scope metadata service)
- World delete uses non-creating root lookup to preserve missing-root no-op semantics.
- Default behavior is leaf-only delete; non-leaf delete requires `force: true`.
- Undo snapshots use JSON-safe deep snapshots through mutator rollback closures.
- No auto-pruning of empty parent/root objects is performed.

## Proposed Next Step

Convert this plan into an implementation checklist with:

- mutator contract additions for `deleteRoomMetadata`, `deleteAreaMetadata`, and `deleteWorldMetadata`,
- leaf-only delete behavior plus `force: true` parent-delete override,
- idempotent no-op handling for missing paths and missing world store roots,
- rollback restoration rules with no automatic parent/root pruning,
- manual/normative/docs alignment for delete semantics and scope boundaries.
