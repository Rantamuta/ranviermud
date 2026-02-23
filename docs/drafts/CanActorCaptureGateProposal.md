# `canActor` Capture Gate Proposal (Draft)

## Status

- Status: `draft-v1`
- Scope: Optional actor-level capture hook for command eligibility
- Binding: no
- Related:
  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/NpcActionArchitecture.md`
  - `docs/normative/EntityResolution.md`

## Purpose

Propose a deferred design for a `canActor` policy surface that can reduce repeated command metadata gating while preserving existing capture-phase invariants.

This proposal is exploratory and intentionally not in v1 implementation scope.

## Problem Statement

Current actor-kind eligibility is primarily declared per command via `metadata.actorKindsAllowed`.

Pain points observed:

- repeated metadata declarations for groups of commands,
- limited centralized actor-level policy expression,
- accidental omission risk where a command should be actor-restricted but metadata is missing.

At the same time, introducing a new gate can create overlap and drift if not tightly integrated with Capture.

## Goals

- Keep Capture as the single policy phase for actor eligibility decisions.
- Improve expressiveness for actor-level permission logic.
- Preserve deterministic, side-effect-free capture behavior.
- Maintain failure-envelope consistency (`ACTOR_KIND_FORBIDDEN` class).

## Non-Goals

- No change to Plan/Commit authority.
- No scheduler or command queue changes.
- No Phase-0 command lookup-hiding design.
- No immediate migration requirement.

## Proposed Surface

Optional actor hook:

```js
canActor(actor, verbId, context) => policyOutcome
```

`policyOutcome` follows existing capture normalization patterns:

- allow: `true`, `'allow'`, `{ ok: true }`, `{ allow: true }`
- deny: `false`, `'deny'`, deny message string, `{ ok:false, ... }`, `{ allow:false, ... }`
- no decision: `undefined` / `null` / unrecognized values

## Phase Placement

`canActor` executes in Capture only.

It MUST NOT be callable from Plan, Bubble, Commit, or Render.

## Proposed Capture Precedence (if adopted)

1. `canActor(actor, verbId, context)` explicit decision (allow/deny)
2. command metadata gate (`metadata.actorKindsAllowed`)
3. existing command-level `captureChecks`
4. existing ordered entity policy checks (`canDirect`/`canIndirect`, metadata.permissions, etc.)

Rationale:

- actor-level explicit policy can be centrally declared,
- existing metadata gate remains valid and backward-compatible,
- no change to downstream entity-level capture ordering semantics.

## Determinism and Safety Constraints

`canActor` must follow capture constraints from Command Architecture:

- no world mutation,
- no audience output,
- no external nondeterministic reads (time/random/network/filesystem/process-global mutable state),
- deterministic outcome for identical input and state.

## Failure Envelope

On deny, the normalized envelope should remain:

```js
{
  ok: false,
  error: {
    code: 'ACTOR_KIND_FORBIDDEN',
    message?: 'Optional override',
    details?: { actorKind, verbId, ... }
  }
}
```

This keeps compatibility with current failure-message mapping and telemetry categories.

## Compatibility Notes

- Existing commands using only `metadata.actorKindsAllowed` remain valid.
- `canActor` is additive if adopted.
- No requirement to expose command-existence hiding to players in this proposal.

## Risks

1. Dual-policy drift
- If both `canActor` and metadata are used inconsistently, outcomes can become confusing.

2. Surface-area growth
- Another hook adds cognitive load and test burden.

3. Misuse risk
- If implementers treat `canActor` as a Plan substitute, phase discipline erodes.

## Risk Mitigations

- Keep Capture-only placement explicit and normative.
- Define strict precedence.
- Keep Plan assertions optional/defensive only.
- Add contract tests for precedence and deterministic behavior.

## Migration Sketch (Deferred)

1. Introduce hook support in Capture evaluation path behind additive behavior.
2. Add tests for:
   - `canActor` allow/deny/no-decision normalization
   - precedence against `metadata.actorKindsAllowed`
   - deterministic behavior
3. Migrate only high-value command groups that benefit from centralized actor policy.
4. Keep metadata gate for command-local overrides.

## Recommendation

Defer implementation for now.

Current `metadata.actorKindsAllowed` + capture-gate policy is sufficient for v1 and aligns with current normative NPC action architecture.

Revisit `canActor` when there is concrete authoring friction across enough commands to justify additional policy surface.
