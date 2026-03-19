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

The DSL should lower directly to the runtime's existing mutation operations and render instructions rather than inventing a separate execution model for conversation effects.

Where practical, author-facing constructs may mirror those underlying runtime instruction shapes closely.

In general, the DSL should try to mirror existing mutation ops and render instructions rather than creating parallel conversation-only forms for the same underlying behavior.

Requests from designers to expose additional existing mutation ops or render instructions through the DSL should be considered on their merits, especially when doing so avoids unnecessary duplication between authored conversation behavior and runtime capability.

The DSL should not use raw command execution as its general effect mechanism.

That means authored effects should not take the form:

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
- single initial state (`idle`)
- event-triggered transitions
- exact event matching
- optional explicit fallback transition via `default`
- conditions (boolean, read-only)
- deterministic transition selection by authored order
- state entry behavior
- transition-time effects
- terminal states

No implicit behavior beyond these.

### Unsupported semantics

Explicitly not supported in v1:

- hierarchical (compound) states
- parallel states
- history states
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
2. For each transition `T`:
   - if `T.event != E`, skip
   - if `T.condition` exists and evaluates false, skip
   - first matching transition is selected
3. If no transition matches:
   - if state `S` defines `events.default` and its condition passes, select `events.default`
   - otherwise, no state change

Determinism rule:

- authored order is the only priority mechanism
- `default` is considered only after exact event matching fails

### Entry behavior

When a state is entered:

1. state becomes current
2. state entry behavior executes in authored order
3. if the state defines `auto`, automatic routing is evaluated
4. available events are enumerated if the state is non-terminal and does not define `auto`

No exit actions in v1.

This profile distinguishes clearly between:

- transition-time behavior attached to the chosen event
- entry behavior attached to the destination state

Transition behavior answers:

- what happens when this event is taken

Entry behavior answers:

- what happens when the machine arrives in this state

### Terminal state behavior

A terminal state:

- has no outgoing transitions
- may produce an entry utterance
- clears engagement after entry
- is a valid persisted progress state
- represents a permanent end to that authored conversation

No implicit transitions out of terminal states.

In this DSL, `terminal` does not mean "goodbye for now" or ordinary session closure.
It means the conversation has genuinely reached its authored end unless some separate system later resets or replaces that progress.

## YAML DSL v1

This draft is intentionally minimal and regular.

### Top-level structure

```yaml
id: blacksmith_conversation
initial: idling

states:
  idling:
    entry:
      effects:
        - messageRoom: "Ah, a traveler. What do you need?"
    events:
      greet:
        label: "Hello."
        to: greeting

      ask_work:
        label: "Need any help?"
        to: discussing_work
```

### State shape

```yaml
<state_id>:
  entry:                                # optional
    effects:
      - <effect>
  terminal: true|false            # optional, default false
  events:                         # optional unless terminal or auto
    <event_id>:
      <transition>
    default:                      # optional unmatched-input fallback
      to: <state_id>
      condition: <predicate ref>  # optional
      effects:
        - <effect>
  auto:                           # optional routing-only block
    - to: <state_id>
      condition: <predicate ref>  # optional
```

### Entry shape

`entry` contains entry-time behavior.

The regular form is:

```yaml
entry:
  effects:
    - messageRoom: "Here you go."
    - transferItem:
        item: widget
        from: inventory
        to: player
    - broadcastToPlayer: "The blacksmith hands you a widget."
```

Entry operations may include:

- NPC speech/render ops such as `messageRoom`
- mutation ops such as `transferItem` or `setPlayerMetadata`
- render ops such as actor-targeted feedback

Likely convenience render shorthands include:

- `messagePlayer`
- `messageRoom`
- `broadcastToPlayer`
- `broadcastToRoom`

These operations should use the same underlying mutation-op and render-instruction execution model already used by the runtime.

These shorthands are intended as author-facing sugar over the existing render-instruction model, not as a separate rendering semantics layer.

Broader broadcast scopes such as area-level variants may be possible later if designer use cases justify exposing them.

`entry` is state-entry behavior only.
It runs when the state is entered, not merely because the state exists.

If a state defines both `entry` and `auto`, `entry.effects` run first and `auto` is evaluated afterward.

Semantic discipline rule:

- transition effects = effects of the player's choice
- entry effects = effects of arriving in that state regardless of path

Placement rule:

- if an effect depends on which event was taken, it belongs on the transition
- if it depends only on the destination state, it belongs on entry

### Transition shape

```yaml
<event_id>:
  label: <menu text>              # required for UI surfaces
  to: <state_id>                  # required unless terminal routing model changes
  condition: <predicate ref>      # optional
  effects:                        # optional
    - <effect>
```

Notes:

- the event key is the canonical event id
- `label` is UI-facing
- `effects` are transition-time operations
- `to` names the destination state

Transition-local `effects` and state `entry` are both allowed.
They are not interchangeable:

- transition `effects` run because the edge was taken
- state `entry` runs because the destination state was entered

### Default fallback shape

```yaml
events:
  default:
    to: <state_id>
    condition: <predicate ref>    # optional
    effects:                      # optional
      - <effect>
```

Notes:

- `default` is optional and singular per state
- `default` is evaluated only when no exact event in the current state matches the incoming input
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

### Terminal states

```yaml
goodbye_forever:
  entry:
    effects:
      - messageRoom: "Goodbye for ever."
  terminal: true
```

Terminal states define no `events`.

Ordinary exit or "goodbye for now" states should usually be modeled as non-terminal resting states rather than `terminal: true`.

For example:

```yaml
see_you_later:
  entry:
    effects:
      - messageRoom: "See you later."
  events:
    greet:
      label: "Hello again."
      to: greeting
```

## DSL to SCXML Mapping

### State

DSL:

```yaml
idle:
  entry:
    effects:
      - messageRoom: "..."
```

SCXML analogue:

```xml
<state id="idle">
  <onentry>execute ordered entry behavior</onentry>
</state>
```

Restriction:

- no `<onexit>`
- no nested `<state>`
- entry behavior is a restricted declarative subset of SCXML `onentry`, not a general executable-content surface
- the restriction is deliberate and remains within the requirement that the DSL be, in principle, compilable to SCXML

### Transition

DSL:

```yaml
greet:
  to: greeting
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
condition: player.hasQuest("forge")
```

SCXML analogue:

```xml
<transition cond="..."/>
```

Restriction:

- not arbitrary script
- must resolve through a predefined predicate system
- `condition` is the DSL's more ergonomic author-facing spelling of SCXML `cond`, not a semantic divergence

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
- transition effects are a restricted declarative subset of SCXML transition executable content, not a general executable-content surface
- the restriction is deliberate and remains within the requirement that the DSL be, in principle, compilable to SCXML

The intent is not to invent a DSL-only effect engine.
Conversation effects should lower to the same underlying runtime mutation operations and render instructions already used elsewhere in the system.

For the same reason, raw `command:` execution is intentionally not the default effect surface for the DSL.

Audience-targeted render helpers such as `broadcastToPlayer` and `broadcastToRoom` may be appropriate initial DSL-facing convenience forms if they lower cleanly to the same runtime render instructions.

### Entry utterance

DSL:

```yaml
entry:
  effects:
    - messageRoom: "Hello."
```

SCXML analogue:

```xml
<onentry>...</onentry>
```

Restriction:

- conversation-authored speech may be expressed through render shorthand rather than a special `say` field
- richer entry behavior may use additional declarative ops
- no embedded arbitrary logic
- `entry.effects` is intentionally narrower than full SCXML `onentry`

### Render shorthand mapping

Author-facing shorthands may map to existing runtime render instructions directly.

Examples:

- `messagePlayer: "..."` -> render instruction using player-only audience
- `messageRoom: "..."` -> render instruction using room transcript audience
- `broadcastToPlayer: "..."` -> `broadcast` instruction targeting player
- `broadcastToRoom: "..."` -> `broadcast` instruction targeting room

More explicit render instruction shapes may still be needed for advanced authored cases, but the common DSL surface should prefer ergonomic shorthand where it lowers cleanly to the existing runtime model.

### Terminal

DSL:

```yaml
terminal: true
```

SCXML analogue:

```xml
<final id="..."/>
```

Restriction:

- no `done.state.*` propagation
- no parent semantics

## Validation Rules

### Required

- top-level `id`
- top-level `initial`
- at least one state
- `initial` must exist in `states`

### State rules

- state ids must be unique
- terminal states must not define `events`
- terminal states must not define `events.default`
- states with `auto` must not define `events`
- states with `auto` must not define `events.default`
- states with `auto` must not define `terminal: true`
- non-terminal states without `auto` should define `events` and may warn if not

### Transition rules

- event keys are required and unique per state
- `to` must reference an existing state
- `label` is required
- duplicate event keys within the same state are forbidden
- the same event key across different states is allowed
- `events.default.to` must reference an existing state when `events.default` is present
- `events.default` must not define `label`

### Determinism rules

- transitions evaluate strictly in authored order
- no ambiguity resolution beyond order

### Forbidden combinations

- `terminal: true` with `events`
- `terminal: true` with `events.default`
- `auto` with `events`
- `auto` with `events.default`
- `auto` with `terminal: true`
- missing `to`
- empty `events` on non-terminal states without `auto` may warn

### Reachability

Recommended:

- all states reachable from `initial`

Unreachable states may warn rather than hard fail in early tooling.

## Worked Examples

### Greeting from idle

```yaml
idling:
  entry:
    effects:
      - messageRoom: "Ah, a traveler."
  events:
    greet:
      label: "Hello."
      to: greeting
```

### Menu-driven branch

```yaml
greeting:
  entry:
    effects:
      - messageRoom: "What do you need?"
  events:
    buy:
      label: "Show me your wares."
      to: shop

    leave:
      label: "Nothing."
      to: goodbye
```

### Directed `say <event> to <npc>`

Input surfaces:

- `1`
- `say buy to blacksmith`

Both resolve to:

```yaml
buy:
  label: "Show me your wares."
  to: shop
```

The machine sees only event `buy`.

### Transition with player override

```yaml
greet:
  label: "Hello."
  effects:
    - messageRoom: "Hello there."
  to: greeting
```

### Transition fallback rendering

```yaml
greet:
  label: "Hello."
  to: greeting
```

Player transcript is derived from the command surface.

### Default fallback transition

```yaml
idling:
  events:
    default:
      effects:
        - messageRoom: "The old miner squints at {actor}."
      to: idling
```

If no exact event matches in `idling`, the machine takes `default`.

### Terminal conversation

```yaml
goodbye_forever:
  entry:
    effects:
      - messageRoom: "Goodbye forever."
  terminal: true
```

### Non-terminal farewell resting state

```yaml
see_you_later:
  entry:
    effects:
      - messageRoom: "See you later."
  events:
    greet:
      label: "Hello again."
      to: greeting
```

### Auto-routing example if allowed

```yaml
greeting_router:
  entry:
    effects:
      - messageRoom: "The blacksmith studies {actor} for a moment."
  auto:
    - to: friendly
      condition: npc.isFriendly

    - to: hostile
      condition: npc.isHostile
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
- evaluated after `entry.effects`, if any
- states with `auto` may not also define `events`
- states with `auto` may not also define `events.default`
- states with `auto` may not also define `terminal: true`
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
- must enforce `auto` exclusivity against `events`, `events.default`, and `terminal`

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
