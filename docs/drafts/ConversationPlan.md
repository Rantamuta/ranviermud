# Conversation FSM With Non-Modal Menu Selectors

## Status

- Status: `draft-v1`
- Binding: Proposed (for Codex implementation)
- Scope: Bundle-layer conversation system built on Command Architecture + Semantic Messaging
- Related:
  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/EntityResolution.md`
  - `docs/normative/SemanticMessaging.md`

## Purpose

Implement NPC conversations as finite state machines (FSMs) with:

- diegetic public transcript (room hears what is said)
- private menu UI visible only to the actor
- deterministic state progression via intent tokens, not raw text parsing
- non-modal interaction (player can walk away or do anything at any time)
- anti-griefing lock with short timeout

Key UX requirement:

- When engaged in a conversation, `say <number>` is a built-in menu selector.
- Bystanders do not see the literal number. They see the expanded utterance.
- The NPC does not receive the public text. The NPC receives an intent token that advances the FSM.

## Non-goals

- Natural language understanding or free-form semantic parsing.
- Multi-participant group conversations.
- Multi-target or indexed audience differentiation beyond `actor`, `target`, `others`.
- Persistent NPC-side state keyed by player (progress is player-owned).

## Core Principles

1. Conversation is opt-in and scoped: the player must initiate with `talk <npc>`.
2. Conversation menus are not modal: the player can move, use other commands, or stop responding at any time.
3. Conversation progress is persistent on the player per NPC.
4. Conversation exclusivity is enforced with an NPC-side lock with a short timeout.
5. Menu selection is a special-case of `say` only when the player is actively engaged with an NPC.
6. FSM advancement is driven by intent tokens delivered to the NPC via Semantic Messaging dispatch, not by raw public speech text.
7. All output is post-commit, and all dispatch is deterministic.

## Terminology

- Actor: the player initiating conversation.
- Target: the NPC being conversed with.
- Others: room bystanders (room broadcast targets excluding actor and sometimes excluding target).
- Engagement: ephemeral, short-lived state indicating the actor is currently talking to a specific NPC.
- Progress: persistent per-player per-NPC FSM state (node id plus variables).

## Data Model

### Player-owned persistent progress

Stored on player meta:

- `conversation.progress.<npcEntityRefOrUuid>.stateId`
- `conversation.progress.<npc...>.vars` (optional object)
- `conversation.progress.<npc...>.flags` (optional object)

Notes:

- This persists across sessions according to player persistence.
- Keying may use NPC UUID if stable, otherwise NPC entityRef. Prefer a stable identity that survives reloads.

### Player-owned ephemeral engagement

Stored on player meta:

- `conversation.active.npcId` (NPC identity)
- `conversation.active.expiresAtTick` (monotonic tick deadline)
- `conversation.active.menu` (the last menu options shown, including mapping from index -> intentId + utterance)
- `conversation.active.menuRevision` (incrementing integer to prevent stale selections, optional)

Rules:

- Engagement is cleared on room change.
- Engagement expires after short inactivity.
- Engagement is refreshed on `talk <npc>` and on successful menu selection.

### NPC-owned ephemeral lock

Stored on NPC meta:

- `conversation.lock.playerId`
- `conversation.lock.expiresAtTick`

Rules:

- Only one player may hold the lock at a time.
- Lock expires automatically after deadline.
- Lock is released immediately if the lock holder leaves the room or disconnects.

Rationale:

- Exclusivity cannot be enforced using player state alone.
- Lock is not narrative state. It is only a mutex.

## Authoring Model

### NPC conversation definition

Each conversable NPC exposes a conversation definition with:

- `states: { [stateId]: StateDef }`
- `initialStateId`
- `openers` (optional, per-state or global)
- `fallback` (optional, per-state or global)
- `intents: { [intentId]: IntentDef }` per state

StateDef fields (minimum):

- `promptText` (NPC utterance for entering this state, optional)
- `menu: MenuOption[]` (list of options shown to actor)
- `fallbackText` (NPC reply when input does not map to valid intent, optional)

MenuOption fields:

- `index` (1-based display index)
- `utterance` (public text said by actor when selected)
- `intentId` (authoritative token)
- `nextStateId` (optional, if transition is static)
- `effects` (optional, for quest flags or variables, implemented as mutations in bubble/commit)

IntentDef fields (minimum):

- `nextStateId` (or a deterministic function of vars)
- `npcReply` (NPC utterance after selecting intent, optional)

Notes:

- This doc does not mandate storage format (YAML vs JS). Bundle code may load definitions from NPC scripts or metadata.

## Commands

### `talk` command

Canonical forms:

- `talk <npc>`
- alias: `talk to <npc>`
- alias: `speak with <npc>`
- alias: `speak to <npc>`

Behavior:

1. Resolve `directTarget` to NPC using Entity Resolution. :contentReference[oaicite:2]{index=2}
2. Capture phase enforces:
   - target is conversable
   - target is in same room as actor
   - lock rules (see below)
3. Target phase:
   - establish or refresh engagement on player
   - set or refresh lock on NPC
   - determine current progress state for this player and NPC
   - enqueue semantic events:
     - actor greeting line (optional and may be authored per NPC or state)
     - NPC opener line (optional)
     - private menu prompt to actor (menu line block)

Important:

- Menu is private to actor.
- Others do not see menu.
- Target NPC does not need to see menu.

### `say` command menu selector extension

When the actor has an active engagement (`player.meta.conversation.active.npcId` exists and is not expired):

- If `say <n>` where `<n>` is a positive integer token and matches a displayed menu option:
  - expand to the menu option utterance for public transcript
  - emit intent token delivery to the target NPC
  - refresh engagement and lock deadlines
  - advance player progress state deterministically

When not engaged, `say <n>` behaves as normal speech and the room sees the literal text.

Additional rules:

- If engaged but `<n>` is out of range or stale (menuRevision mismatch), treat as:
  - actor says the literal text (normal say), or
  - produce a conversation-local error to actor only (recommended).
This spec recommends a private error to actor only, so the public transcript is not polluted.

## Locking and Anti-griefing

### Lock acquisition

On `talk <npc>`:

- If NPC has no lock or lock expired:
  - lock is set to actor and expires soon
- If NPC lock is held by actor:
  - refresh lock
- If NPC lock is held by another player and not expired:
  - deny with message:
    - `Foo and the squirrel are talking right now. It would be rude to interrupt.`

Denial should happen in Capture for clear phase ownership. :contentReference[oaicite:3]{index=3}

### Lock refresh

Lock refresh occurs on:

- successful `talk <npc>`
- successful `say <n>` menu selection

### Lock release

Lock is released when:

- actor leaves the room
- actor disconnects
- engagement expires and a cleanup tick runs (optional)
- NPC despawns or resets (bundle owned behavior)

Timeout must be short to prevent monopolization.

## Rendering and Dispatch

This system uses Semantic Messaging as the sole output mechanism with one required extension: target-specific non-text delivery (token delivery).

### Required semantic event patterns

1. Public actor utterance

- audiencePolicy: `self_and_others` (room transcript)
- exclude target NPC from `others` partition when engaged conversation is active

Result:

- actor sees: `You say, "<expanded utterance>".`
- others see: `Rendall says, "<expanded utterance>".`
- target NPC does not receive this text line

1. NPC reply utterance

- audiencePolicy: `self_and_others` or `self_target_and_others` depending on desired transcript
- In this conversation model, the NPC reply is public to the room.

1. Private menu prompt

- audiencePolicy: `self` only
- content includes:
  - a one-line prompt, for example `What do you want to say?`
  - numbered options list

### Target token delivery

For each menu selection, dispatch must also deliver a non-text payload to the target NPC that advances the FSM.

Normative extension:

- A semantic event instruction may include:
  - `deliveries.target` as a non-text payload
- If `deliveries.target` is present:
  - dispatcher must invoke `target.onSemanticDelivery(payload, context)` deterministically
  - no text is sent to target for that instruction unless explicitly authored
  - delivery failures are diagnostics only and do not roll back commit

Payload shape (minimum):

```js
{
  type: 'conversationIntent',
  npcId,
  actorId,
  intentId,
  fromStateId,
  toStateId,
  menuRevision
}
````

The NPC uses this payload to:

- validate it matches expected engagement and lock holder
- update player progress on the actor
- enqueue the NPC reply semantic event and the next private menu prompt semantic event

Important:

- FSM advancement and subsequent semantic events must be deterministic for identical state and payload.

## Command Architecture Phase Mapping

This section is binding for implementation placement.

- Phase 0 Receive Input:

  - parse `talk` and `say`
  - recognize `say <integer>` token only at later stages (do not rewrite at parse time unless strictly necessary)
- Phase 1 Entity Resolution:

  - `talk` resolves directTarget (NPC)
  - `say` does not require resolution unless you already support directed speech, which is out of scope here
- Phase 2 Capture:

  - enforce lock acquisition and conversable checks for `talk`
  - for `say <n>` menu selection:

    - ensure active engagement is valid and not expired
    - ensure NPC lock is held by actor
- Phase 3 Target:

  - `talk` sets engagement and prepares initial post-commit semantic events
  - `say` constructs post-commit semantic events and includes `deliveries.target` when in selector mode
- Phase 4 Bubble:

  - may add reaction events, but must not veto
- Phase 5 Commit:

  - persist player progress changes and lock changes atomically with other plan operations
- Phase 6 Render/Dispatch:

  - perform semantic event rendering
  - deliver target payload to NPC via `onSemanticDelivery`

Reference:

## Determinism Requirements

For identical committed state:

- menu generation must be identical
- menu ordering and numbering must be identical
- selector mapping from number to intentId must be identical
- lock acquisition and expiry decisions must be identical
- recipient sets and render text must be identical

Implementation should prefer a monotonic tick counter for expiry deadlines.

## Failure Behavior

### `talk` failures

- Not conversable: actor sees a polite refusal.
- Locked by other player: actor sees the rude-to-interrupt message.
- Target not present: standard resolution not-found.

### `say <n>` selector failures

When engaged:

- out of range: actor-only private error such as `That is not one of the options.`
- stale menuRevision: actor-only private error such as `That conversation has moved on.`
- lock lost: actor-only private error such as `The squirrel is no longer talking to you.` and clear engagement

When not engaged:

- treat as normal speech

No selector failure should spam the room transcript.

## Movement and Cleanup

On player movement (successful `go` commit):

- clear `player.meta.conversation.active`
- if player held `npc.meta.conversation.lock`, release it

On disconnect:

- same as movement cleanup

Optional:

- periodic cleanup tick may clear expired locks, but it must not be required for correctness.

## Testing Plan

Add bundle tests covering:

1. `talk` sets engagement and lock and prints menu to actor only.
2. Second player `talk` is denied with the interrupt message while lock is valid.
3. Lock expires after timeout and second player can `talk`.
4. `say 1` while engaged expands utterance for actor and others, does not show literal `1`.
5. `say 1` dispatches target delivery payload and advances progress state.
6. `say 9` while engaged yields actor-only error and does not pollute room.
7. Moving rooms clears engagement and releases lock.
8. Re-`talk` resumes from player-stored progress state.

## Implementation Notes (Bundle Layer)

- Prefer implementing engagement and menu selector logic in bundle command dispatch or in `say` command handler, not in engine internals.
- Keep Entity Resolution pure and output-free.
- Keep all output through semantic events only.
- Keep lock enforcement in Capture for consistent phase ownership.
- Implement `onSemanticDelivery` as an NPC script hook or behavior, invoked only from Render/Dispatch.
