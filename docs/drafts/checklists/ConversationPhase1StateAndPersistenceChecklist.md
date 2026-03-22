# Conversation Phase 1 State And Persistence Checklist

## Status

- Status: active
- Scope: checklist for conversation Phase 1 state and persistence
- Source plan: `docs/plans/ConversationPhase1StateAndPersistencePlan.md`
- In Scope:
  - define persisted player-owned conversation state under `player.metadata.conversations.<areaId>.<npcId>.state`
  - keep the per-NPC persisted object shape extensible for future conversation fields
  - define the stable NPC identity contract used for persistence lookups
  - add helper surfaces for persisted conversation reads/writes and separate ephemeral engagement ownership
- Out of Scope:
  - `talk`, directed `say <event> to <npc>`, authored loading, FSM execution, menus, and numeric interception
  - room, area, or world metadata ownership for conversation state
  - bare-`talk` / "most recent conversation" resume behavior
- Acceptance Criteria:
  - conversation state is player-owned persisted state stored in player metadata
  - same-named NPC ids in different areas do not collide in persistence
  - ephemeral engagement stays outside persistent player metadata and does not alter `player.metadata.conversations`

## Checklist

- [ ] `C01` [conversation-state] Add module [conversation-state.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-state.js) that resolves a stable `npcRef` into `areaId` and `npcId` and derives the only supported persistence path `conversations.<areaId>.<npcId>.state`.
  - Trace:
    - "`npcId` means the area-local authored NPC id, while `npcRef` means the logical unique authored reference `<areaId>:<npcId>`." (`Intent`)
    - "Define the stable NPC identity contract used for persistence lookups." (`In Scope`)
  - Validation handoff: `S1`, `unit`
- [ ] `C02` [conversation-state] Implement non-mutating persisted read helpers in [conversation-state.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-state.js) by delegating to `getPlayerMetadata` from [player-metadata.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/player-metadata.js), and return explicit absence when no stored state exists.
  - Trace:
    - "reading persisted conversation state" (`In Scope`)
    - "Reads of persisted conversation state are non-mutating." (`Acceptance Criteria`)
    - "If no persisted state exists for a specific NPC, helper resolution returns no stored state and does not silently write defaults." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`
- [ ] `C03` [conversation-state] Implement the per-NPC persistence contract in [conversation-state.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-state.js) so `player.metadata.conversations.<areaId>.<npcId>` remains an object root and `state` is stored as a field within that object rather than collapsing the NPC entry to a scalar value (depends on `C01`).
  - Trace:
    - "Keep the persistent shape extensible for future per-NPC conversation fields such as visited transitions or conversation-local variables." (`In Scope`)
    - "Persisted conversation progress is stored only under `player.metadata.conversations.<areaId>.<npcId>.state`." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`
- [ ] `C04` [conversation-state] Implement persisted write-planning helpers in [conversation-state.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-state.js) as a thin convenience layer over [mutator.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/mutator.js), emitting `setPlayerMetadata` instructions that target only `player.metadata.conversations.<areaId>.<npcId>.state` (depends on `C01`, `C03`).
  - Trace:
    - "writing persisted conversation state through existing mutator-backed metadata paths" (`In Scope`)
    - "Persisted conversation progress is stored only under `player.metadata.conversations.<areaId>.<npcId>.state`." (`Acceptance Criteria`)
    - "Use existing player metadata and mutator mechanisms rather than inventing a second persistence substrate." (`Constraints`)
    - "Must remain a thin convenience layer over existing player metadata reads and mutator-backed writes, not a parallel state system." (`Implementation Surfaces`)
    - "The chosen helper surfaces are specific enough that later phases can use them without inventing additional persistence conventions." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `contract/parity`
- [ ] `C05` [conversation-state] Reject or fail explicitly when NPC identity resolution cannot produce safe `areaId` and `npcId` path segments, and do not fall back to display names, runtime UUIDs, or a raw `<areaId>:<npcId>` metadata key segment (depends on `C01`).
  - Trace:
    - "Do not invent a fallback persistence key based on NPC display name or runtime instance UUID; use authored stable identity that can be decomposed into `areaId` and `npcId`." (`Constraints`)
    - "If runtime surfaces expose that authored identity as `entityReference` or an equivalent `<areaId>:<npcId>` reference, derive metadata path segments from it rather than persisting a raw `a:b` key segment." (`Constraints`)
    - "Same-named NPC ids in different areas do not collide in persistence." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `contract/parity`
- [ ] `C06` [conversation-engagement] Add module [conversation-engagement.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-engagement.js) that exposes runtime-owned `get`, `set`, `replace`, and `clear` operations for ephemeral engagement state without reading from or writing to player metadata.
  - Trace:
    - "Define the ownership model for ephemeral engagement state as non-persistent runtime state, separate from player metadata." (`In Scope`)
    - "Temporary engagement state is stored outside persistent player metadata." (`Acceptance Criteria`)
    - "Clearing or replacing temporary engagement state does not alter `player.metadata.conversations`." (`Acceptance Criteria`)
  - Validation handoff: `S3`, `unit`
- [ ] `C07` [conversation-engagement] Key the [conversation-engagement.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-engagement.js) helper around runtime-owned player/session identity and keep its storage mechanism internal so later phases consume only the helper boundary (depends on `C06`).
  - Trace:
    - "Treat ephemeral engagement as session/runtime state, not persistent metadata." (`Constraints`)
    - "Own ephemeral engagement storage behind a runtime-owned helper, likely backed by session-scoped storage." (`Implementation Surfaces`)
  - Validation handoff: `S3`, `integration/smoke`

## Behavior Slices

- `S1`
  - Goal: establish the player-metadata-backed conversation state helper contract and extensible per-NPC object shape.
  - Items: `C01`, `C02`, `C03`, `C04`.
  - Type: behavior
- `S2`
  - Goal: harden the persistence identity and ownership boundaries so later phases cannot drift.
  - Items: `C05`.
  - Type: behavior
- `S3`
  - Goal: establish a separate runtime-owned helper boundary for ephemeral engagement state.
  - Items: `C06`, `C07`.
  - Type: behavior
