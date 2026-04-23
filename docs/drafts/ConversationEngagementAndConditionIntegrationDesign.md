# Conversation Engagement And Condition Integration Design

## Status

- Status: draft
- Scope: collaboration outline for the missing live-runtime conversation pieces

## Supersession Note

This draft is superseded in its `engagement` direction.

Maintainer decision:

- conversation engagement is not part of the necessary runtime model for the
  current conversation milestone
- future agents should treat engagement-oriented design in this document as a
  rejected branch of exploration rather than as pending work

Why this direction was rejected:

- the authoritative conversation state is the persisted player-owned FSM state
  keyed by NPC identity
- addressed speech such as `say <action> to <npc>` does not require a separate
  ephemeral engagement record in order to determine the current conversation
  state
- the minimum runtime needed for conversations is:
  - resolve the addressed NPC
  - load that NPC's conversation definition
  - read the persisted conversation state for this player/NPC pair
  - evaluate guards, transitions, default routes, and auto-settling
  - commit authored effects and the new persisted conversation state
  - render the resulting NPC output
- menu behavior is not evidence that engagement is needed; menu is better
  understood as render/output behavior and may be implemented later without
  promoting engagement into a core runtime abstraction
- bare `talk` convenience or resume behavior is too small a feature to justify
  a parallel engagement subsystem
- engagement introduces extra complexity around ownership, invalidation,
  disconnect cleanup, movement cleanup, staleness, and rollback while solving
  no required problem for the current `say <action> to <npc>` milestone

Future-agent guidance:

- do not add engagement storage as part of directed speech bring-up
- do not add engagement adapters or engagement lifecycle management unless a
  later maintainer explicitly reopens that design choice
- read the guard-evaluation parts of this draft, if needed, independently from
  the engagement material

Superseded sections of intent include:

- defining a live engagement record
- choosing an engagement owner
- setting, replacing, or clearing engagement from directed speech
- designing engagement adapters or engagement-driven lifecycle behavior

## Purpose

This document describes the two conversation-runtime elements that are still
missing even after directed speech and authored instructions are live:

- adoption of transient conversation engagement in real runtime behavior
- adoption of condition evaluation in the live conversation path

It is intentionally narrower than the full conversation-system design.

It does not cover:

- menu rendering
- numeric menu input
- documentation refresh
- broader conversation authoring redesign

It is a design document only.
It does not authorize implementation by itself.

## Problem Statement

The repository now has:

- persisted conversation state
- pure conversation evaluation
- conversation definition loading and validation
- directed event speech through `say <event> to <npc>`
- authored-instruction transposition

However, the live conversation runtime still falls short in two important ways:

1. `conversation-engagement.js` exists only as an in-memory helper and is not
   yet adopted by the live runtime
2. `conversation-runtime.js` supports authored conditions, but
   `directed-speech.js` does not currently provide a `conditionEvaluator` or
   `q` surface when evaluating live conversations

Those gaps mean the system is not yet a complete live conversation runtime,
even before menu work begins.

## Design Goal

Make the already-built conversation runtime fully live in two specific ways:

- every successful live conversation interaction should be able to establish
  and update a transient engagement record
- every live conversation evaluation path should be able to honor authored
  conditions using the shared predicate runtime and query facade

In plain language:

- the runtime should know what live conversation the player is currently in
- the runtime should evaluate the same conditioned behavior in play that the
  pure evaluator already supports in tests

## Scope

### In Scope

- define what a live engagement record is
- define when engagement is created, updated, and cleared
- define how directed speech should use and refresh engagement
- define how live conversation condition evaluation should be wired
- define the runtime-owned boundary between conversation evaluation and the
  predicate runtime
- define tests needed for this integration slice

### Out of Scope

- menu rendering
- numeric menu interception
- `talk` command UX details beyond what is needed to keep the design coherent
- stale menu rejection mechanics beyond recording the data engagement will need
- documentation/manual updates

## Existing Pieces And Their Intended Roles

### Persisted Conversation State

`conversation-state.js` owns long-lived player progress.

It answers questions like:

- what authored state is this player in with NPC `area:npc`?

That state belongs in player metadata because it survives sessions and location
changes.

### Transient Conversation Engagement

`conversation-engagement.js` is intended to hold live, in-memory interaction
state.

It answers questions like:

- which NPC is the player currently engaged with?
- which conversation definition is active right now?
- what visible options or event mapping were last shown?
- what revision or freshness token should later menu work use?

That state does not belong in player metadata because it is ephemeral and tied
to the current live interaction loop.

### Pure Conversation Evaluation

`conversation-runtime.js` is the pure evaluator.

It already supports:

- exact event selection
- default event fallback
- auto settling
- visible event filtering
- transition selection
- conditioned visibility and conditioned transitions

It is intentionally not responsible for:

- loading the live predicate runtime
- deciding how sessions remember current engagement
- rendering menus
- intercepting later input

### Directed Speech

`directed-speech.js` is the first real live conversation entry surface.

Today it:

- loads the bound conversation
- evaluates the selected event
- lowers effects
- persists the settled authored state
- returns a command-style result

What it does not yet do:

- establish a live engagement record
- evaluate authored conditions through the shared predicate runtime

## Core Design Principles

1. Persisted progress and transient engagement remain separate concerns.
2. Condition evaluation must reuse the shared predicate runtime rather than
   inventing a conversation-only evaluator.
3. Directed speech remains a valid live conversation surface even before menus.
4. Engagement should be menu-ready without forcing menu implementation now.
5. Live conversation evaluation should remain deterministic for identical
   committed state and identical input.

## Engagement Design

### What Engagement Represents

Engagement is the runtime's memory of the current live conversation context for
one owner object such as a session or player.

It is not progress.
It is not transcript history.
It is not a durable save slot.

It is the minimal live record that lets later conversation input surfaces stay
coherent.

### Recommended Record Shape

This draft recommends a narrow engagement object shape:

```js
{
  npcRef: 'codex:tomo',
  definitionId: 'tomo_caretaker',
  sourceSurface: 'directedSpeech',
  settledState: 'awaiting_second_offering',
  visibleEventIds: ['mine', 'offering', 'goodbye'],
  revision: 1,
}
```

Required fields:

- `npcRef`
- `definitionId`
- `sourceSurface`
- `settledState`
- `visibleEventIds`
- `revision`

Notes:

- `visibleEventIds` may be empty for a surface that does not currently render a
  menu, but it should still be recorded from the evaluator result
- `revision` is included now so later menu work does not need to redesign the
  engagement contract

### Engagement Owner

This draft recommends storing engagement by session-owned object rather than by
  durable player object when possible.

Reason:

- engagement is live-interaction state
- it should disappear naturally when the session disappears
- it should not leak across reconnect or multi-session scenarios without an
  explicit design choice

If a session object is not available at the integration seam, a narrower owner
decision may be needed during implementation, but the preferred model is
session-scoped engagement.

### When Engagement Is Set

Directed speech should set or replace engagement when:

- the addressed utterance successfully resolves to a conversation route
- the evaluation succeeds

The recorded engagement should reflect the settled runtime result, not just the
input utterance.

That means it should use:

- the evaluated `settledState`
- the evaluated `visibleEvents`

### When Engagement Is Cleared

This design recommends clearing engagement when:

- the conversation reaches a final state
- the command surface determines the engaged NPC is no longer a valid live
  partner for follow-up interaction
- later menu work detects a stale or superseded engagement

For the narrow integration slice, the most important rule is:

- final states should not leave an active engagement behind

### Why Directed Speech Should Set Engagement Even Before Menus

Because engagement is not only for menus.

It also establishes:

- the runtime notion of "current live conversation partner"
- a consistent bridge to later `talk` resume behavior
- a place to record the last visible event set produced by the evaluator

Without that, menu work later would have to invent live conversation ownership
retroactively.

## Condition Evaluation Design

### Live Condition Boundary

Conversation conditions should be evaluated through the existing shared
predicate runtime and query facade.

The conversation system should not:

- parse arbitrary expressions
- invent a new query language
- duplicate read-only metadata and container lookup logic

### Live Evaluation Shape

When `directed-speech.js` evaluates a conversation, it should provide:

- `conditionEvaluator`
- `q`

to `evaluateConversationRuntime(...)`.

The evaluator already defines the call contract.
The missing work is wiring.

### Condition Evaluator Contract

This draft recommends a tiny adapter layer owned by the conversation runtime
integration, not by the pure evaluator.

Conceptually:

```js
function evaluateConversationCondition(condition, context) {
  return predicateRuntime.evaluate(condition, {
    actor: player,
    q,
    context,
  });
}
```

Where:

- `actor` is the player speaking
- `q` is the shared read-only query facade
- `context` is the runtime-provided conversation context already described by
  `conversation-runtime.js`

### Query Facade Scope

The query facade should be built from the same live scope the directed-speech
surface already knows:

- `player`
- `npc`
- `room`
- `area`
- `world`
- `currentContainer` where relevant

The key requirement is that authored conversation conditions see the same
runtime-visible world state that other predicate-runtime consumers use.

### Failure Behavior

If a live conversation encounters a condition and the condition integration
layer cannot evaluate it correctly, that should remain an explicit maintainer
failure, not a silent pass-through.

Recommended behavior:

- if predicate runtime is unavailable or miswired, log a maintainer-facing
  failure and fall through to ordinary speech, matching the current
  directed-speech failure posture
- do not silently treat all conditions as true
- do not silently treat all conditions as false

### Determinism Requirement

For identical committed state and identical input:

- the same conditions must pass or fail
- the same visible events must be exposed
- the same transition/default/auto behavior must occur

This design therefore assumes the condition adapter uses only the read-only
predicate runtime and query facade, not ad hoc world inspection spread across
conversation code.

## Recommended Integration Shape

This draft recommends two small integration helpers rather than pushing more
logic directly into `directed-speech.js`.

### Helper 1: Conversation Engagement Adapter

Responsibilities:

- build the canonical engagement object from evaluation results
- set or clear engagement on the chosen owner

### Helper 2: Conversation Condition Adapter

Responsibilities:

- resolve or create the predicate runtime
- create the read-only query facade for the current live scope
- provide `conditionEvaluator` and `q` to the pure evaluator

This keeps `directed-speech.js` as orchestration code rather than letting it
grow into the conversation runtime itself.

## Proposed Runtime Flow

For successful directed speech:

1. Resolve NPC and bound conversation definition.
2. Build live conversation scope:
   - player
   - npc
   - room
   - area
   - world/state
3. Build condition adapter inputs:
   - predicate runtime
   - query facade
   - `conditionEvaluator`
   - `q`
4. Evaluate conversation through `conversation-runtime.js`.
5. If evaluation fails, log and fall through exactly as today.
6. If no transition is selected, do not intercept exactly as today.
7. Transpose authored instructions exactly as today.
8. Persist settled conversation state exactly as today.
9. Set or clear transient engagement based on the evaluation result.
10. Return the normal command-style plan/render result.

## Proposed File Map

### Existing Files Likely Touched

`bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js`

- supply live condition support to `evaluateConversationRuntime(...)`
- set or clear live engagement after successful evaluation

`bundles/bundle-rantamuta/lib/runtime/conversation/conversation-engagement.js`

- likely reused as-is for storage
- may gain very small convenience helpers if implementation needs a canonical
  engagement builder

`bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js`

- ideally unchanged
- only touch if integration exposes a missing stable output detail

### Likely New Files

`bundles/bundle-rantamuta/lib/runtime/conversation/conversation-condition-adapter.js`

- builds `conditionEvaluator` and `q` from live runtime scope

`bundles/bundle-rantamuta/lib/runtime/conversation/conversation-engagement-adapter.js`

- builds canonical engagement objects and applies set/clear policy

## Test Strategy

### Focused Runtime Tests

Add or extend tests proving:

- directed speech supplies condition evaluation for visible events
- directed speech supplies condition evaluation for event transitions
- directed speech supplies condition evaluation for `events.default`
- directed speech supplies condition evaluation for `auto`

### Engagement Tests

Add or extend tests proving:

- successful directed speech sets engagement
- final-state directed speech clears engagement
- engagement records the settled state and visible event ids
- no-intercept ordinary speech does not create engagement

### Integration Tests

Add or extend tests proving:

- live condition evaluation and persisted state update both occur in one
  successful directed-speech path
- authored instructions still execute normally when conditions are involved

## Non-Goals For This Design

This document does not decide:

- exact `talk` command semantics
- exact menu rendering format
- numeric selector interception mechanism
- stale-menu rejection UX

Those should follow later, after the live engagement and condition layers are
real.

## Open Questions

- should engagement be keyed by session, player, or a session-owned wrapper
  object?
- should condition adapter creation live entirely inside directed speech, or
  should it become reusable for later `talk` and menu surfaces immediately?
- should final-state handling clear engagement immediately even if visible
  events are still technically present in the settled runtime result?

## Recommendation

This draft recommends:

- treat engagement adoption and condition evaluation as the next real
  conversation-runtime milestone
- keep the pure evaluator pure
- keep persistence and engagement separate
- reuse the shared predicate runtime instead of building a conversation-only
  condition system
- complete this integration before menu work begins
