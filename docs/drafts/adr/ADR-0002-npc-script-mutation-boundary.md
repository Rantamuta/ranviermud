# ADR-0002: Enforce NPC Script Mutation Boundary

- Status: proposed
- Date: 2026-02-23
- Owner: maintainers

## Context

Recent NPC architecture work established a direction where NPC actions should execute through the same command pipeline used by players.

Runtime and content review identified residual direct mutation in NPC scripts, including direct movement and direct metadata mutation outside Commit.

This creates architectural risks:

- bypass of capture/planner policy checks
- mutation outside transactional commit semantics
- non-uniform failure behavior
- increased determinism drift risk

Without an explicit contract, future content can reintroduce bypass mutations.

## Decision

Adopt a normative NPC action contract section in `docs/normative/NpcActionArchitecture.md#non-negotiable-contract-v1` with these rules:

1. NPC scripts are decision producers, not mutation executors.
2. World-state mutation for NPC behavior MUST occur only through command pipeline Commit.
3. If required mutation is not representable by existing mutator operations, the behavior MUST fail explicitly and MUST NOT fallback to direct mutation.
4. Actor-authored NPC narration representable as semantic events should flow through command render instructions, not direct transport output.

## Consequences

Positive:

- Stronger consistency with Command Architecture invariants.
- Lower risk of hidden world-state mutation paths.
- More testable and reviewable NPC behavior.
- Cleaner compatibility posture for future NPC expansion.

Tradeoffs:

- Some existing NPC content must be migrated.
- New gameplay needs may require explicit mutator-op design before content can ship.
- Short-term implementation friction for behaviors previously coded as direct script mutation.

## Follow-ups

1. Inventory all current NPC script direct mutation surfaces and classify migration scope.
2. Add regression tests for prohibited direct mutation in NPC scripts.
3. Implement missing mutation operations where required for migrated NPC behaviors.
4. Decide whether to add runtime guardrails that hard-fail known direct-mutation helper usage in NPC script contexts.

## Related

- `docs/normative/NpcActionArchitecture.md#non-negotiable-contract-v1`
- `docs/normative/CommandArchitecture.md`
- `docs/normative/SemanticMessaging.md`
