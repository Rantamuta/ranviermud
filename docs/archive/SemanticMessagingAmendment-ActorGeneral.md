# Semantic Messaging Amendment: Actor-General Dispatch (Draft)

## Status

- Status: `draft-v1`
- Scope: Proposed amendment to `docs/normative/SemanticMessaging.md`
- Binding: no
- Related:
  - `docs/normative/SemanticMessaging.md`
  - `docs/normative/CommandArchitecture.md`
  - `docs/drafts/NpcActionArchitecture.md`

## Purpose

Define the minimum semantic-messaging amendment required to support actor-general command dispatch (player and non-player actors) without introducing a second output path.

This amendment is a pre-flight dependency for a shared `say` command and for NPC actions that use standard Render/Dispatch semantics.

## Problem Statement

Current semantic messaging assumes actor resolution through `participants.actor = { selector: 'currentPlayer' }`.

That assumption creates two architectural problems:

1. Non-player actor dispatch cannot reuse semantic events as first-class output.
2. Scripts are pushed toward direct broadcast calls, bypassing the command render contract.

Observed runtime alignment issue:

- `render.semanticEvent` currently requires `currentPlayer` to be resolvable in dispatch context.
- `others` recipient construction is rooted on current-player room rather than resolved actor room.

## Goals

- Preserve Semantic Messaging invariants already declared in normative spec.
- Allow semantic actor resolution for any command actor kind.
- Keep one canonical semantic-event path for player and non-player commands.
- Unblock shared `say` command behavior without direct broadcast.

## Non-Goals

- Queue/scheduler policy
- NPC autonomy loops
- Combat scheduling integration
- Changes to mutation/commit semantics

## Proposed Normative Deltas

### 1) Instruction Contract

`participants.actor` remains required.

Amend selector support so actor may resolve via either:

- `{ selector: 'currentActor' }`
- `{ selector: 'currentPlayer' }` (compatibility alias)

No pre-bound runtime entity objects are permitted in instruction payload.

### 2) Participant Selector Contract (v1 Amendment)

Allowed selectors become:

- `{ selector: 'currentActor' }`
- `{ selector: 'currentPlayer' }`
- `{ selector: 'entityByContextRole', role: 'directTarget' | 'indirectTarget' }`

Rules:

- `currentActor` is the preferred actor selector for new command content.
- `currentPlayer` remains valid for compatibility with existing player-scoped content.
- When actor kind is `player`, `currentPlayer` MUST resolve to the same entity identity as `currentActor`.
- Unknown selectors remain invalid and instruction is skipped with diagnostics.

### 3) Render Context Contract

Semantic render context must include actor identity explicitly:

- `currentActor` (required for semantic-event dispatch)
- `currentPlayer` (optional compatibility alias when actor is a player)
- existing bound context roles (`directTarget`, `indirectTarget`) remain unchanged

Actor resolution for semantic events MUST NOT depend on session/transport ownership.

### 4) Recipient Construction and Ordering

Amend recipient construction to resolve `others` from the resolved semantic actor room.

Updated construction rules:

1. Resolve actor from `participants.actor`.
2. Resolve target from `participants.target` when present.
3. Require non-null `actor.room`; if null, fail instruction with `SEMANTIC_ACTOR_ROOM_UNRESOLVED` and perform no partial dispatch.
4. Build base `others` from `actor.room.getBroadcastTargets()` iteration order.
5. Remove null/invalid recipients.
6. De-duplicate by stable identity (first occurrence wins).
7. Apply policy exclusions (`self`/`target`), then dispatch in deterministic order:
   - actor (if included)
   - target (if included and distinct)
   - others (stable order)

### 5) Output Channel Constraint

Semantic-event output remains Render/Dispatch-only.

Commands/scripts must not substitute direct broadcast calls for semantic-event instructions when equivalent semantic-event delivery is available.

This does not remove `broadcast` instruction support; it prevents bypassing semantic-event architecture for actor speech/actions that fit semantic-event contracts.

### 6) Failure Ownership and Codes

Dispatch-layer ownership remains unchanged.

Add recommended diagnostics for actor-general resolution failures:

- `SEMANTIC_ACTOR_UNRESOLVED`
- `SEMANTIC_ACTOR_ROOM_UNRESOLVED`
- `SEMANTIC_ACTOR_ALIAS_MISMATCH`

Existing failure handling still applies: log structured error, skip invalid instruction, continue remaining render instructions.

### 7) Determinism

No determinism relaxation is introduced by this amendment.

For identical committed state and identical semantic instruction payload:

- participant resolution outcome is identical
- recipient partitions/order are identical
- rendered text per recipient is identical

## Backward Compatibility

- Existing content that uses `participants.actor = { selector: 'currentPlayer' }` remains valid.
- New shared commands (including `say`) should prefer `currentActor`.
- Runtime MUST map `currentPlayer` to `currentActor` when actor is player-backed; this is compatibility behavior, not a separate dispatch path.
- If both are present and identity does not match, semantic dispatch fails deterministically with `SEMANTIC_ACTOR_ALIAS_MISMATCH`.

## Pre-Flight Dependency for Shared `say`

The shared `say` command depends on this amendment so actor speech can use one semantic-event contract regardless of actor kind.

Baseline event shape for `say`:

```js
{
  type: 'semanticEvent',
  template: '{actor.you} {verb:say}, "{object.direct}"',
  audiencePolicy: 'self_and_others',
  participants: {
    actor: { selector: 'currentActor' }
  },
  objectText: {
    direct: '<utterance>'
  }
}
```

Command-level validation (`say`):

- empty/whitespace utterance is invalid
- semantic event generation is render contribution only
- no world mutation

## Open Questions

1. What is the deprecation horizon, if any, for `currentPlayer` once migration to `currentActor` is complete?
2. Should this amendment explicitly state actor-feedback return payloads are out of scope and delegated to NPC action architecture?
3. Should validation require `currentActor` in new content once migration passes, or remain recommendation-only?
