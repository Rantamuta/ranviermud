# D3 Delete Metadata Ops Plan (Draft)

## Status

- Status: `draft-v1`
- Type: discussion plan (not implementation checklist)
- Scope: explicit metadata delete operation design and rollout sequencing

## Goal

Define and agree the framework contract for explicit delete operations:

- `deleteAreaMetadata`
- `deleteWorldMetadata`

with deterministic rollback, clear command-phase ownership, and no hidden persistence behavior.

## Current State (Observed)

- `setAreaMetadata` exists and stores values (including `null`) in `area.metadata.values`.
- Delete operations are not implemented yet.
- Proposal discussion includes delete operations, but implementation sequencing remains open.
- World metadata surface is not fully established in runtime yet.

## Discussion Topics

1. Area delete semantics
- Confirm key/path behavior for area deletes under `area.metadata.values`.
- Confirm no-op vs error behavior when deleting missing paths.
- Confirm rollback restoration rules for parent/root object shape.

2. World delete prerequisites
- Confirm required world metadata runtime store/service ownership model.
- Confirm whether world delete can proceed independently of `setWorldMetadata`, or if both should ship together.

3. API/read-path alignment
- Confirm whether `q.getWorldMetadata(...)` must ship in same phase as `deleteWorldMetadata`.
- Confirm expected behavior for missing values (`undefined`) and stored `null`.

4. Documentation and authored guidance
- Clarify that delete is operation-driven and distinct from storing `null`.
- Clarify how designers should choose between setting `null` and explicit delete (if both are allowed semantics).

## Open Questions

- Should `deleteWorldMetadata` be deferred until `setWorldMetadata` exists, or is delete-first acceptable?
- For missing path deletes, do we prefer strict failure or idempotent no-op?
- Do we need explicit authored examples for nested path deletes before implementation?

## Risks to Watch

- Partial world-scope implementation that introduces future migration friction.
- Rollback edge cases around parent/root cleanup deleting unrelated sibling state.
- Ambiguity between `null` as data vs delete as operation leading to authored confusion.

## Proposed Next Step

After the decision points above are agreed, convert this plan into a checklist with:

- test-first characterization,
- area delete implementation,
- world store + world delete sequencing,
- query/docs updates,
- explicit regression coverage for rollback and missing-key behavior.
