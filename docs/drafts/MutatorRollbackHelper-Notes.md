# Mutator Rollback Helper Notes

## Status

- Status: `draft-stub`
- Type: design bookmark
- Scope: rollback safety for metadata mutators
- Intent: capture problem and options for a later implementation pass

## Problem Summary

Current metadata mutators duplicate rollback logic that:

1. creates intermediate parent objects on write,
2. removes written leaf on undo,
3. prunes empty parents on undo.

When each mutator re-implements this flow, it is easy to prune parents that existed before the mutation. That breaks strict rollback inversion and can silently remove preexisting structure.

This risk is expected to recur as metadata mutators expand to additional scopes (`room`, `area`, `item`, `npc`, and potentially `world` variants), because each scope needs the same parent-creation and undo-pruning behavior.

## Why This Is Worth Revisiting

1. Same bug class can be reintroduced by copy/paste rollback loops.
2. Review burden grows with each new mutator surface.
3. Small inconsistencies in undo semantics are hard to detect without dedicated regression tests.

## Candidate Solutions

### Option A: Small helper for created-parent tracking (recommended first step)

Introduce shared helpers for the specific fragile parts:

1. create path segments while recording only parents created by this mutation,
2. prune only recorded created parents during undo (if still empty).

Pros:

1. Minimal behavior change.
2. Low risk and easy to adopt incrementally.
3. Preserves scope-specific validation and policy differences.

Cons:

1. Does not unify full mutator flow.
2. Some duplication remains outside helper boundaries.

### Option B: Metadata write transaction helper

Create a higher-level helper that performs full set-mutation + undo wiring for metadata paths.

Pros:

1. Strong consistency across mutators.
2. Fewer moving parts per mutator implementation.

Cons:

1. Higher coupling across room/area/world/item/npc policy differences.
2. Harder to introduce safely without broader characterization tests.

### Option C: Snapshot-and-restore strategy per mutation

Capture larger snapshots and restore on rollback rather than path-level undo.

Pros:

1. Simpler rollback correctness model.

Cons:

1. Higher memory churn.
2. Larger blast radius if snapshot boundaries are wrong.
3. Less precise than path-level inverse behavior.

## Suggested Future Direction

1. Keep immediate bug fixes minimal in active branches.
2. In a dedicated follow-up, implement Option A and migrate existing metadata mutators to it.
3. Add a focused test matrix for rollback inversion cases (preexisting empty parents, ancestor overwrite, and out-of-order undos) before considering Option B.

