# Conversation Domain Specific Language (DSL)

## Status

- Status: draft
- Scope: critique-ready YAML DSL draft for authored conversations

## Purpose

This document captures a concrete draft of the conversation domain specific language so it can be reviewed, criticized, and revised directly.

It is intentionally separate from:

- `ConversationAuthoringToolingDesign.md`, which defines the authoring/tooling posture
- `ConversationSystemDesign.md`, which defines runtime behavior and conversation semantics

This document is not a locked standard.
It is a working draft intended to make the shape of the DSL concrete enough for critique.

## Design Posture

This DSL is:

- YAML-authored
- conversation-first
- constrained by a small SCXML-shaped semantic core
- designed for readability, review, and deterministic behavior

This DSL is not:

- raw SCXML
- a diagram format
- a generic executable scripting surface

Even though this DSL is authored in YAML rather than XML, it should prefer SCXML vocabulary wherever that remains readable for authors.

That preference is deliberate:

- it keeps the authored model close to the semantic north star
- it reduces unnecessary local translation between the DSL and SCXML concepts
- it makes later review, validation, and future compilation to SCXML easier to reason about

The goal is not to mimic SCXML syntax mechanically.
The goal is to keep the DSL semantically close enough that a valid authored machine remains, in principle, compilable to SCXML.

The DSL should lower directly to the runtime's existing mutation operations and render instructions rather than inventing a separate execution model for conversation effects.

Where practical, author-facing constructs may mirror those underlying runtime instruction shapes closely.

In general, the DSL should try to mirror existing mutation ops and render instructions rather than creating parallel conversation-only forms for the same underlying behavior.

The same principle applies to `condition` evaluation.

Conversation conditions should lower to the runtime's existing read-only query surface rather than inventing a separate predicate or expression engine for conversations.

When new condition reads are needed, they should be added to the shared `q` query facade rather than introduced as conversation-local helpers.

In the current runtime, that means expanding `createQueryFacade(...)` in `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` and exposing the new read there alongside the existing `q.*` surface.

Conversation conditions must not lower to area predicate-registry scripts.
Predicate-registry evaluation is render-only and intentionally treats unknown
predicates, thrown predicates, and non-boolean returns as `false`; that
fail-to-false behavior is appropriate for descriptive text selection but too
permissive for authored state progression.

Requests from designers to expose additional existing mutation ops or render instructions through the DSL should be considered on their merits, especially when doing so avoids unnecessary duplication between authored conversation behavior and runtime capability.

The DSL should not use raw command execution as its general effect mechanism.

That means authored instructions should not take the form:

```yaml
- command: give silver coin to player
```

Reason:

- commands are actor-driven command surfaces, not pure effect primitives
- command execution bundles parsing, resolution, policy, planning, mutation, and rendering in ways that are less explicit for authored conversation behavior
- using raw commands as effects would make the DSL harder to reason about deterministically
- if designers repeatedly need a command-like behavior, the better answer is usually to expose an explicit declarative op or shorthand that lowers cleanly to the runtime's existing mutation and render model

## SCXML Profile v1

### Supported semantics

This profile adopts a strict subset of SCXML semantics:

- flat atomic states only
- single declared initial state via `initial`
- event-triggered transitions
- exact event matching
- optional explicit fallback transition via `default`
- conditions (boolean, read-only)
- deterministic transition selection by authored order
- state `onEntry` behavior
- transition-time effects
- final states

No implicit behavior beyond these.

### Unsupported semantics

Explicitly not supported in v1:

- hierarchical (compound) states
- parallel states
- history states
- `onExit` / state-exit behavior
- `invoke`, `send`, or external event queues
- wildcard or prefix event matching
- arbitrary executable content
- transition-less implicit fallthrough
- multi-target transitions

### Transition selection and priority

Given:

- current state `S`
- incoming event `E`

Evaluation:

1. Collect authored events in order from state `S`.
2. Resolve the authored event entry for `E` in state `S`.
3. If the event uses the single-transition shorthand:
   - evaluate its `condition` if present
   - if it passes, that transition is selected
4. If the event defines ordered `transitions`:
   - evaluate them in authored order
   - first transition whose `condition` passes is selected
5. If no transition matches:
   - if state `S` defines `events.default` and its condition passes, select `events.default`
   - otherwise, no state change

Determinism rule:

- authored order is the only priority mechanism
- `default` is considered only after exact event evaluation fails to produce a selected transition

### onEntry behavior

When a state is entered:

1. state becomes current
2. state `onEntry` behavior executes in authored order
3. if the state defines `auto`, automatic routing is evaluated
4. available events are enumerated if the state is non-final and does not define `auto`

No exit actions in v1.

This profile distinguishes clearly between:

- transition-time behavior attached to the chosen event
- `onEntry` behavior attached to the destination state

Transition behavior answers:

- what happens when this event is taken

`onEntry` behavior answers:

- what happens when the machine arrives in this state

### Final state behavior

A final state:

- has no outgoing transitions
- may produce an entry utterance
- clears engagement after entry
- is a valid persisted progress state
- represents a permanent end to that authored conversation

No implicit transitions out of final states.

In this DSL, `final` does not mean "goodbye for now" or ordinary session closure.
It means the conversation has genuinely reached its authored end unless some separate system later resets or replaces that progress.

## YAML DSL v1

This draft is intentionally minimal and regular.

### Top-level structure

```yaml
id: blacksmith_conversation
initial: idling

states:
  idling:
    onEntry:
      actions:
        - messageRoom: "Ah, a traveler. What do you need?"
    events:
      greet:
        label: "Hello."
        target: greeting

      ask_work:
        label: "Need any help?"
        target: discussing_work

      ask_leave:
        label: "How do I leave?"
        transitions:
          - condition:
              getActorMetadata:
                key: death.isDead
                equals: true
            effects:
              - messageRoom: "Cross the river and find your body."
            target: departing
          - effects:
              - messageRoom: "You are not yet our subject."
            target: idling
```

### State shape

```yaml
<state_id>:
  onEntry:                              # optional
    actions:
      - <effect>
  final: true|false               # optional, default false
  events:                         # optional unless final or auto
    <event_id>:
      <event definition>
    default:                      # optional unmatched-input fallback
      target: <state_id>
      condition: <query object>   # optional
      effects:
        - <effect>
  auto:                           # optional routing-only block
    - target: <state_id>
      condition: <query object>   # optional
```

### onEntry shape

`onEntry` contains state-entry behavior.

The regular form is:

```yaml
onEntry:
  actions:
    - broadcast:
        audience: room
        message: "Here you go."
    - transferItem:
        item: widget
        from: inventory
        to: player
    - semanticEvent:
        template: "{actor.You} {verb:hand} {object.direct} to {target.you}."
        audiencePolicy: self_target_and_others
        participants:
          actor:
            selector: currentActor
          target:
            selector: entityByContextRole
            role: indirectTarget
        objectText:
          direct: "the widget"
```

The canonical authored surface for effects should mirror the runtime instruction contracts directly.

That means:

- the exact runtime instruction name should be available in the DSL
- the exact runtime field names should be available in the DSL
- the transposer should resolve symbolic values into runtime objects where needed
- the DSL should not depend on a second conversation-only instruction vocabulary for the same behavior

For example, object-bearing runtime fields still need authored references rather than live objects.
That means authored YAML may use values such as:

```yaml
- movePlayer:
    toRoom: start
```

and the transposition step resolves:

- `start` -> `<currentAreaId>:start`

Fully qualified refs remain valid when the authored instruction needs to target a room outside the current area:

```yaml
- movePlayer:
    toRoom: "codex:start"
```

and the transposition step resolves:

- `"codex:start"`

When the runtime contract already implies a single obvious subject from transposition context,
the authored DSL may omit that redundant field.

For example:

- `movePlayer` may omit `player` when the current player is the only sensible subject
- `setPlayerMetadata` may omit `player` when the current player is the intended target
- `setRoomMetadata` may omit an explicit room target when the current room is intended

If the target is not the local default, the authored DSL should provide the explicit override:

```yaml
- setRoomMetadata:
    roomRef: "codex:start"
    key: bells.rung
    value: true
```

`onEntry` is state-entry behavior only.
It runs when the state is entered, not merely because the state exists.

If a state defines both `onEntry` and `auto`, `onEntry.actions` run first and `auto` is evaluated afterward.

Semantic discipline rule:

- transition effects = effects of the player's choice
- `onEntry` actions = effects of arriving in that state regardless of path

Placement rule:

- if an effect depends on which event was taken, it belongs on the transition
- if it depends only on the destination state, it belongs on `onEntry`

### Transition shape

```yaml
<event_id>:
  label: <menu text>              # required for UI surfaces
  target: <state_id>              # required unless final routing model changes
  condition: <query object>       # optional
  effects:                        # optional
    - <effect>
```

Notes:

- the event key is the canonical event id
- `label` is UI-facing
- `effects` are transition-time operations
- `target` names the destination state
- this is shorthand for the common case where one visible event has one outcome

An event may also define ordered guarded outcomes directly:

```yaml
<event_id>:
  label: <menu text>
  transitions:
    - condition: <query object>   # optional
      effects:                    # optional
        - <effect>
      target: <state_id>
```

Rules:

- an event may use either the single-transition shorthand or `transitions:`, not both
- when `transitions:` is present, authored order is semantically significant
- the first transition whose condition passes is selected
- if no transition in `transitions:` matches, the event has no matching outcome and normal `events.default` handling may apply
- if an event should always produce some outcome, its final transition should be unconditional
- unconditional transitions should appear last

Transition-local `effects` and state `onEntry` are both allowed.
They are not interchangeable:

- transition `effects` run because the edge was taken
- state `onEntry` runs because the destination state was entered

### Default fallback shape

```yaml
events:
  default:
    target: <state_id>
    condition: <query object>     # optional
    effects:                      # optional
      - <effect>
```

Notes:

- `default` is optional and singular per state
- `default` is evaluated only when no exact event in the current state produces a selected transition for the incoming input
- `default` is not menu-visible and does not define `label`
- `default` is a reserved event key rather than a normal authored event name
- `default` follows the same placement rule as other transition effects

### Naming convention

By default:

- events should use imperative names such as `greet`, `ask_work`, or `leave`
- states should describe conditions, modes, or situations such as `idling`, `greeting`, or `discussing_old_mine`

This convention is intended to make the machine read naturally:

- state `idling`
- event `greet`
- state `greeting`

Authors may deviate when there is a strong reason, but this is the preferred style.

### Player transcript rules

- if transition `effects` include an authored player transcript/render override such as `messageRoom`, use it
- otherwise, fall back to command-surface rendering

### Final states

```yaml
goodbye_forever:
  onEntry:
    actions:
      - messageRoom: "Goodbye for ever."
  final: true
```

Final states define no `events`.

Ordinary exit or "goodbye for now" states should usually be modeled as non-final resting states rather than `final: true`.

For example:

```yaml
see_you_later:
  onEntry:
    actions:
      - messageRoom: "See you later."
  events:
    greet:
      label: "Hello again."
      target: greeting
```

## DSL to SCXML Mapping

### State

DSL:

```yaml
greeting:
  onEntry:
    actions:
      - messageRoom: "..."
```

SCXML analogue:

```xml
<state id="greeting">
  <onentry>execute ordered on-entry behavior</onentry>
</state>
```

Restriction:

- no `<onexit>`
- no nested `<state>`

### Transition

DSL:

```yaml
greet:
  target: greeting
```

SCXML analogue:

```xml
<transition event="greet" target="greeting"/>
```

Restriction:

- single target only
- exact event match only

### Condition

DSL:

```yaml
condition:
  actorQuestActive: "test:predicateQuestActive"
```

SCXML analogue:

```xml
<transition cond="..."/>
```

Restriction:

- not arbitrary script
- must resolve through a predefined declarative query-object surface
- should lower to the runtime's existing read-only `q.*` query facade rather than to predicate registry scripts
- `condition` is the DSL's more ergonomic author-facing spelling of SCXML `cond`, not a semantic divergence

The query-object surface and the predicate registry are not interchangeable.
The query facade provides deterministic reads for state-machine evaluation; the
predicate registry provides render-time prose selection with fail-to-false
diagnostics.

### Condition purity

Conditions are part of the deterministic machine contract, not merely a content convention.

Condition evaluation must not depend on:

- wall-clock time
- random values
- iteration over unordered collections
- ambient mutable globals
- current menu numbering
- transcript or render-only context

Conditions may read only declared deterministic game-state surfaces exposed to the conversation machine.

Where practical, the DSL should mirror the existing query facade directly. For example, a condition such as:

```yaml
condition:
  actorQuestActive: "test:predicateQuestActive"
```

is intended to lower to a read against the existing query surface parallel to `q.actorQuestActive('test:predicateQuestActive')`.

If future authored conversations need additional reads such as NPC-scoped metadata, those reads should be added to the shared query facade and then mirrored into the DSL condition surface, rather than introduced as a separate conversation-only query mechanism.

### Effects

DSL:

```yaml
effects:
  - grant_xp: 10
```

SCXML analogue:

```xml
<transition>
  <!-- restricted declarative transition actions -->
</transition>
```

Restriction:

- declarative effect vocabulary only
- executed at commit time only

The intent is not to invent a DSL-only effect engine.
Conversation effects should lower to the same underlying runtime mutation operations and render instructions already used elsewhere in the system.

For the same reason, raw `command:` execution is intentionally not the default effect surface for the DSL.

The canonical DSL-facing surface should expose the exact runtime instruction names and field names directly.

### Current supported mutation ops

The DSL should be expected to support every current mutation op without surprise.

For the current runtime, that means the canonical authored instruction names are:

- `transferItem`
- `movePlayer`
- `operateDoor`
- `openDoor`
- `closeAndLockDoor`
- `setPlayerMetadata`
- `setRoomMetadata`
- `setAreaMetadata`
- `setWorldMetadata`
- `deleteRoomMetadata`
- `deleteAreaMetadata`
- `deleteWorldMetadata`

The authored payload for each effect should use the same field names as the runtime instruction contract.

Examples:

```yaml
effects:
  - transferItem:
      item: widget
      from: inventory
      to: player

  - movePlayer:
      toRoom: "codex:start"

  - operateDoor:
      mutation: open
      actor: player
      direction: north

  - setPlayerMetadata:
      key: story.phase
      value: 2

  - setRoomMetadata:
      roomRef: "codex:start"
      key: bells.rung
      value: true
```

When a runtime field expects an object, the authored DSL supplies a symbolic reference.
The transposer resolves that reference against explicit runtime context.

For room-targeting fields, a bare room id is current-area relative unless otherwise specified.
So `toRoom: start` means `toRoom: "<currentAreaId>:start"` at transposition time.
Fully qualified refs such as `codex:start` remain available when the authored instruction needs to target a specific remote room.

If a field can be inferred safely from the current transposition context, the authored DSL may omit it.
This should only be allowed when the omission is part of the documented contract for that effect,
not as ad hoc transposer behavior.

So:

- `movePlayer` may omit `player` when the acting player is implicit
- `setPlayerMetadata` may omit `player` when the current player is implicit
- `setRoomMetadata` may omit `roomRef` when the current room is intended
- explicit overrides such as `roomRef` remain available when a remote target is needed

Examples:

- `actor: npc`
- `toRoom: start`
- `toRoom: "codex:start"`
- `roomRef: "codex:start"`
- `item: widget`

This keeps the authored DSL canonical in shape while still allowing runtime object resolution during transposition.

### Canonical render instruction surface

The DSL should also be expected to support every current render instruction without surprise.

For the current runtime, that means:

- `broadcast`
- `semanticEvent`

The authored payload should again mirror the runtime field names directly.

Examples:

```yaml
effects:
  - broadcast:
      audience: room
      message: "Here you go."

  - semanticEvent:
      template: "{actor.You} {verb:hand} {object.direct} to {target.you}."
      audiencePolicy: self_target_and_others
      participants:
        actor:
          selector: currentActor
        target:
          selector: entityByContextRole
          role: indirectTarget
      objectText:
        direct: "the widget"
```

For `broadcast`, the current runtime contract includes:

- `audience`
- `message`
- optional `targetSelector`
- optional `targetRoomRef`
- optional `exceptSelector`
- optional `exceptRoomRef`

For `semanticEvent`, the current runtime contract includes:

- `template`
- `audiencePolicy`
- `participants`
- optional `objectText`
- optional `templates`

### onEntry utterance

DSL:

```yaml
onEntry:
  actions:
    - broadcast:
        audience: room
        message: "Hello."
```

SCXML analogue:

```xml
<onentry>...</onentry>
```

Restriction:

- conversation-authored speech should be expressed through canonical render instructions rather than a special `say` field
- richer `onEntry` behavior may use additional declarative ops
- no embedded arbitrary logic

### Optional sugar layer

Optional author-facing sugar may still exist later, but it should be defined as explicit sugar over the canonical instruction surface, not as the primary contract.

Examples:

- `messagePlayer: "..."` -> sugar over `broadcast`
- `messageRoom: "..."` -> sugar over `broadcast`
- `broadcastToPlayer: "..."` -> sugar over `broadcast`
- `broadcastToRoom: "..."` -> sugar over `broadcast`

But the canonical authored DSL should remain the exact runtime instruction vocabulary so the lowering boundary stays predictable and drift is minimized.

### Final

DSL:

```yaml
final: true
```

SCXML analogue:

```xml
<final id="..."/>
```

Restriction:

- no `done.state.*` propagation
- no parent semantics

## SCXML Conformance and Lowering

This DSL is not raw SCXML, but valid authored machines should remain, in principle, compilable to SCXML.

Invariant:

- this DSL is intended to remain a constrained subset of SCXML
- a valid DSL machine should remain, in principle, compilable to SCXML
- the reverse is not a goal: arbitrary SCXML machines are not expected to map back into this DSL
- future DSL growth should preserve this one-way subset relationship unless a deliberate divergence is documented

The relationship for each construct should be understood in one of these categories:

- `direct subset of SCXML`
  - the DSL construct maps directly to an SCXML concept while intentionally remaining within a narrower supported profile
- `sugar over SCXML`
  - the DSL construct is an author-facing convenience that can be lowered cleanly to SCXML concepts without changing the machine model
- `deliberate divergence`
  - the DSL construct is a repo-local convenience that is not a native SCXML concept and must be documented together with its intended lowering strategy

The current profile is intended to stay coherent under those terms:

- `state`
  - classification: `direct subset of SCXML`
  - flat atomic states only
  - no nested `<state>`
- `transition`
  - classification: `direct subset of SCXML`
  - single target only
  - exact event matching only
  - ordered per-event `transitions:` is author-facing sugar for multiple same-event SCXML transitions evaluated in document order
- `condition`
  - classification: `direct subset of SCXML`
  - `condition` is the DSL's more ergonomic author-facing spelling of SCXML `cond`
  - the expression surface is intentionally restricted to deterministic query objects that lower to the existing read-only `q.*` facade
- `effects`
  - classification: `sugar over SCXML`
  - author-facing shorthand for restricted declarative executable content on transitions
  - lowers to the same underlying mutation and render model already used by the runtime
- `onEntry.actions`
  - classification: `sugar over SCXML`
  - restricted declarative subset of SCXML `onentry`
  - not a general executable-content surface
- `auto`
  - classification: `sugar over SCXML`
  - author-facing shorthand for constrained eventless routing
  - the SCXML lowering model is an eventless transition with the same ordered condition evaluation
- `default`
  - classification: `deliberate divergence`
  - explicit unmatched-input fallback represented as the reserved event key `events.default`
  - this is not a native SCXML transition kind
  - one plausible lowering strategy is a wildcard catch-all transition such as `event="*"` placed after exact event transitions for that state
- `final`
  - classification: `direct subset of SCXML`
  - within the flat-state profile, `final: true` maps cleanly to SCXML `<final>`
  - because hierarchy is out of scope, this profile intentionally excludes parent completion semantics and `done.state.*`
- `label`
  - classification: `deliberate divergence`
  - author-facing menu/presentation metadata rather than a core SCXML statechart term

## Validation Rules

### Required

- top-level `id`
- top-level `initial`
- at least one state
- `initial` must exist in `states`

### State rules

- state ids must be unique
- final states must not define `events`
- final states must not define `events.default`
- states with `auto` must not define `events`
- states with `auto` must not define `events.default`
- states with `auto` must not define `final: true`
- non-final states without `auto` should define `events` and may warn if not

### Transition rules

- event keys are required and unique per state
- shorthand `target` must reference an existing state
- `label` is required
- duplicate event keys within the same state are forbidden
- the same event key across different states is allowed
- an event may not define both shorthand `target`/`condition`/`effects` and `transitions:`
- every `transitions:` entry must define `target`
- every `transitions:` target must reference an existing state
- transitions after an unconditional transition should be rejected or warned as unreachable
- `events.default.target` must reference an existing state when `events.default` is present
- `events.default` must not define `label`
- condition purity violations must be rejected

### Determinism rules

- transitions evaluate strictly in authored order
- ordered per-event `transitions:` evaluate strictly in authored order
- no ambiguity resolution beyond order

### Forbidden combinations

- `final: true` with `events`
- `final: true` with `events.default`
- `auto` with `events`
- `auto` with `events.default`
- `auto` with `final: true`
- missing `target`
- empty `events` on non-final states without `auto` may warn

### Reachability

Recommended:

- all states reachable from `initial`

Unreachable states may warn rather than hard fail in early tooling.

## Worked Examples

### Greeting from initial state

```yaml
idling:
  onEntry:
    actions:
      - messageRoom: "Ah, a traveler."
  events:
    greet:
      label: "Hello."
      target: greeting
```

### Menu-driven branch

```yaml
greeting:
  onEntry:
    actions:
      - messageRoom: "What do you need?"
  events:
    buy:
      label: "Show me your wares."
      target: shop

    leave:
      label: "Nothing."
      target: goodbye
```

### One event with multiple guarded outcomes

```yaml
introducing:
  events:
    ask_how_to_leave:
      label: "How do I get out of here?"
      transitions:
        - condition:
            getWorldMetadata:
              key: isVillageRestored
              equals: false
          effects:
            - messageRoom: "The Realm is unbalanced and I need warriors to set it right."
          target: departing

        - condition:
            getActorMetadata:
              key: death.isDead
              equals: true
          target: evaluating

        - effects:
            - messageRoom: "You are not yet our subject."
          target: introducing
```

### Directed `say <event> to <npc>`

Input surfaces:

- `1`
- `say buy to blacksmith`

Both resolve to:

```yaml
buy:
  label: "Show me your wares."
  target: shop
```

The machine sees only event `buy`.

### Transition with player override

```yaml
greet:
  label: "Hello."
  effects:
    - messageRoom: "Hello there."
  target: greeting
```

### Transition fallback rendering

```yaml
greet:
  label: "Hello."
  target: greeting
```

Player transcript is derived from the command surface.

### Default fallback transition

```yaml
idling:
  events:
    default:
      effects:
        - messageRoom: "The old miner squints at {actor}."
      target: idling
```

If no exact event matches in `idling`, the machine takes `default`.

### Final conversation

```yaml
goodbye_forever:
  onEntry:
    actions:
      - messageRoom: "Goodbye forever."
  final: true
```

### Non-final farewell resting state

```yaml
see_you_later:
  onEntry:
    actions:
      - messageRoom: "See you later."
  events:
    greet:
      label: "Hello again."
      target: greeting
```

### Auto-routing example if allowed

```yaml
greeting_router:
  onEntry:
    actions:
      - messageRoom: "The blacksmith studies {actor} for a moment."
  auto:
    - target: returning_customer
      condition:
        actorQuestCompleted: "codex:blacksmithIntro"

    - target: first_meeting
```

## Eventless Transition Decision

### Option A: Forbid in v1

Benefits:

- fully visible control flow
- no hidden behavior
- simpler mental model
- simpler validation

Risks:

- duplication of guarded transitions
- pressure to add ad hoc routing features later
- routing logic may leak into runtime or condition structure

Authoring impact:

- more verbose branching
- less elegant faction or reputation handling

Validation impact:

- trivial

Preview impact:

- straightforward

### Option B: Allow narrow routing subset

Definition:

- allowed only as `auto` block
- evaluated after `onEntry.actions`, if any
- states with `auto` may not also define `events`
- states with `auto` may not also define `events.default`
- states with `auto` may not also define `final: true`
- no chaining beyond one hop, if enforced

Benefits:

- clean separation of player intent and post-intent routing
- handles faction or reputation routing cleanly
- avoids duplication
- aligns with SCXML eventless semantics without full complexity

Risks:

- hidden transitions if previews do not render them clearly
- potential misuse as a logic layer

Authoring impact:

- adds one additional concept
- may model derived routing more honestly

Validation impact:

- must detect cycles
- must enforce no long chains, if that rule is adopted
- must enforce `auto` exclusivity against `events`, `events.default`, and `final`

Preview implications:

- must render automatic routing distinctly from player-selectable events

Recommendation in this draft:

- leave this decision open pending review

## Initial Assessment

This draft aims for a minimal, coherent, SCXML-aligned profile:

- no hierarchy
- no scripting
- no hidden execution model by default
- explicit events
- deterministic transitions

The main open design question is whether controlled automatic routing belongs in v1 or should be deferred.
