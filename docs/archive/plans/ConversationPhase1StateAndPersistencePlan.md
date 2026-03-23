# Conversation Phase 1 State And Persistence Plan

## Status

- Status: archived
- Scope: formal plan for conversation Phase 1 state and persistence

## Goal

Establish the persistent and ephemeral state model that the conversation runtime will use before any broader conversation command surface, menu loop, or authored execution flow is implemented.

## Intent

In this plan, "conversation state" means the persisted per-player, per-NPC conversation record stored in player metadata.

The system should remember one player's conversation state separately for each stable NPC, and it should keep temporary engagement or menu state somewhere else so that losing or clearing the temporary state does not erase the player's real progress.

If a player interacts with a specific NPC again later, the runtime should continue from that NPC's stored conversation state instead of starting over, unless no stored state exists.

For this plan, `npcId` means the area-local authored NPC id, while `npcRef` means the logical unique authored reference `<areaId>:<npcId>`.

## In Scope

- Define the persisted player-owned conversation progress shape as `player.metadata.conversations.<areaId>.<npcId>.state`.
- Keep the persistent shape extensible for future per-NPC conversation fields such as visited transitions or conversation-local variables.
- Define the stable NPC identity contract used for persistence lookups.
- Limit persisted Phase 1 conversation state ownership to player metadata only; room, area, and world metadata are not part of this phase.
- Add runtime helper surfaces for:
  - resolving a stable `npcRef` into `areaId` and `npcId`,
  - reading persisted conversation state,
  - writing persisted conversation state through existing mutator-backed metadata paths,
  - clearing or replacing ephemeral engagement state without touching persisted progress.
- Define the ownership model for ephemeral engagement state as non-persistent runtime state, separate from player metadata.
- Add tests that prove persisted progress and ephemeral engagement are independent.
- Add tests that prove specific-NPC state lookup returns persisted state when present and otherwise signals absence cleanly for later authored-state resolution.

## Out of Scope

- `talk`, `talk to <npc>`, or any other new player-facing command surface.
- Bare-`talk` or "most recent conversation" resume behavior.
- Directed `say <event> to <npc>` interception.
- Authored conversation file loading or validation.
- FSM transition evaluation, visible-event computation, or `events.default` execution.
- Menu generation, numeric selector mapping, or numeric input interception.
- Lifecycle cleanup behavior such as disconnect, room-change, or despawn invalidation beyond selecting the ownership model for ephemeral engagement.
- Multiplayer transcript visibility behavior.

## Acceptance Criteria

- Conversation state is player-owned persisted state stored in player metadata, not in NPC runtime state or ephemeral engagement storage.
- Persisted conversation progress is stored only under `player.metadata.conversations.<areaId>.<npcId>.state`.
- The runtime uses one stable NPC identity contract and does not fall back to unstable identifiers such as runtime UUIDs or display names.
- Same-named NPC ids in different areas do not collide in persistence.
- Reads of persisted conversation state are non-mutating.
- If persisted state exists for a specific NPC, helper resolution returns that state.
- If no persisted state exists for a specific NPC, helper resolution returns no stored state and does not silently write defaults.
- Temporary engagement state is stored outside persistent player metadata.
- Clearing or replacing temporary engagement state does not alter `player.metadata.conversations`.
- The chosen helper surfaces are specific enough that later phases can use them without inventing additional persistence conventions.

## Constraints

- Preserve the repository's runtime/content boundary from [AGENTS.md](/mnt/c/workspace/mud/ranviermud/AGENTS.md): runtime infrastructure must remain content-agnostic.
- Keep the work inside `bundle-rantamuta`; do not change engine internals.
- Use existing player metadata and mutator mechanisms rather than inventing a second persistence substrate.
- Treat conversation state as player-owned persisted state in player metadata, not NPC-owned state.
- Treat ephemeral engagement as session/runtime state, not persistent metadata.
- Do not introduce room, area, or world metadata ownership for conversation state in this phase.
- Do not introduce player-visible command behavior in this phase.
- Do not invent a fallback persistence key based on NPC display name or runtime instance UUID; use authored stable identity that can be decomposed into `areaId` and `npcId`.
- If runtime surfaces expose that authored identity as `entityReference` or an equivalent `<areaId>:<npcId>` reference, derive metadata path segments from it rather than persisting a raw `a:b` key segment.

## Implementation Surfaces

- [player-metadata.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/player-metadata.js)
  - Reuse existing safe dot-path read behavior for `conversations.<areaId>.<npcId>.state`.
- [mutator.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/mutator.js)
  - Reuse existing `setPlayerMetadata` commit path for persisted conversation writes.
- New helper surface, likely [conversation-state.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-state.js)
  - Must remain a thin convenience layer over existing player metadata reads and mutator-backed writes, not a parallel state system.
  - Own stable NPC identity resolution and path derivation.
  - Own non-mutating read helpers.
  - Own write-planning helpers for persisted state.
- New helper surface, likely [conversation-engagement.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-engagement.js)
  - Own ephemeral engagement storage behind a runtime-owned helper, likely backed by session-scoped storage.
  - Prevent temporary engagement state from leaking into player metadata.
- Likely test surfaces:
  - [player.metadata.helper.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/player.metadata.helper.test.js)
  - new conversation state helper tests
  - new conversation engagement helper tests
  - targeted command-dispatch or player-lifecycle tests only if needed to prove session-owned engagement behavior

## Risks and Mitigations

- Risk: choosing an unstable or ambiguous NPC identity now causes future progress corruption, resets, or cross-area collisions.
  - Mitigation: require one authored stable identity contract that resolves to `npcRef = <areaId>:<npcId>` and derive persistence paths from `areaId` plus `npcId`; fail explicitly when either segment is unavailable.
- Risk: engagement state is stored in player metadata "temporarily" and later becomes sticky accidental persistence.
  - Mitigation: keep engagement in a runtime-owned ephemeral store from the start and keep the storage mechanism behind a dedicated helper surface.
- Risk: later phases invent ad hoc helper paths because this phase stays too abstract.
  - Mitigation: introduce concrete helper modules now and make later phases consume those helpers instead of raw metadata path manipulation.
- Risk: this phase quietly expands into command or menu behavior.
  - Mitigation: keep command surfaces, interception, and menu behavior explicitly out of scope.

## Open Questions / Assumptions

- Assumption: hosted conversation NPCs expose a stable authored identity suitable for persistence keying and path derivation, either directly as `areaId` plus `npcId` or via an equivalent `npcRef`.
- Assumption: session objects remain available at the relevant runtime seams for future engagement consumers.
- Open question: whether later lifecycle cleanup will need a helper to enumerate or invalidate all engagement state for a given player in addition to session-keyed lookup.
  - This phase does not need to solve cleanup policy, only ownership and storage boundaries.

## Validation Strategy

This phase changes executable helper behavior and runtime state ownership, so it requires repository behavior-change validation.

### Unit

Required evidence:

- helper tests proving stable NPC identity derivation into `areaId` and `npcId` from authored identity
- helper tests proving persisted reads are non-mutating
- helper tests proving writes target only `conversations.<areaId>.<npcId>.state`
- helper tests proving same-named NPC ids in different areas resolve to different persistence paths
- helper tests proving missing persisted state returns no stored state rather than writing defaults
- helper tests proving engagement state can be set, read, cleared, and replaced without touching player metadata

Pass/fail:

- Pass if the helper layer provides one stable persistence contract and one separate ephemeral engagement contract with no cross-contamination.
- Fail if helper reads mutate metadata, helper writes touch the wrong path, or ephemeral engagement leaks into persisted player state.

### Integration / Smoke

Required evidence:

- tests proving that after persisted state is written for a specific NPC, later state resolution for that same NPC returns the stored state
- tests proving that after persisted state is written for `forest:tomo`, state resolution for `rantamuta:tomo` remains independent
- tests proving that when no stored state exists, the helper layer signals absence cleanly rather than fabricating or writing a default
- tests proving that clearing temporary engagement does not remove persisted conversation progress

Pass/fail:

- Pass if persisted state survives separate runtime interactions while ephemeral engagement can be discarded independently.
- Fail if specific-NPC state cannot be resumed reliably or if clearing engagement erases progress.

### Contract / Parity

Required evidence:

- tests proving the chosen persistence contract does not silently fall back to runtime UUIDs or display names
- tests proving raw `<areaId>:<npcId>` identity is not persisted as a single forbidden metadata key segment
- tests proving the phase introduces no new player-visible command behavior

Pass/fail:

- Pass if the phase establishes only the intended storage and ownership primitives.
- Fail if this phase introduces a second persistence convention, unstable key fallback, or premature command-surface behavior.

### Required Repository Validation

For executable implementation of this phase:

- `npm test`
- `npm run ci:local`

## Compatibility and Records

- No `CHANGELOG.md` entry is expected for plan authoring itself.
- For implementation of this phase, a normative doc update is not expected unless the work changes a binding executable behavior contract rather than only establishing internal runtime state ownership.
- This phase should not introduce new public command semantics, so compatibility impact should remain internal to the conversation runtime foundation.
