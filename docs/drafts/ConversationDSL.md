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

## SCXML Profile v1

### Supported semantics

This profile adopts a strict subset of SCXML semantics:

- flat atomic states only
- single initial state (`idle`)
- event-triggered transitions
- exact event matching
- guards (boolean, read-only)
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

1. Collect transitions in authored order from state `S`.
2. For each transition `T`:
   - if `T.event != E`, skip
   - if `T.guard` exists and evaluates false, skip
   - first matching transition is selected
3. If no transition matches:
   - no state change
   - optional reaction behavior is outside the core profile

Determinism rule:

- authored order is the only priority mechanism

### Entry behavior

When a state is entered:

1. state becomes current
2. state entry behavior executes in authored order
3. available actions are enumerated if the state is non-terminal

No exit actions in v1.

This profile distinguishes clearly between:

- transition-time behavior attached to the chosen action
- entry behavior attached to the destination state

Transition behavior answers:

- what happens when this action is taken

Entry behavior answers:

- what happens when the machine arrives in this state

### Terminal state behavior

A terminal state:

- has no outgoing transitions
- may produce an entry utterance
- clears engagement after entry
- ends the conversation

No implicit transitions out of terminal states.

## YAML DSL v1

This draft is intentionally minimal and regular.

### Top-level structure

```yaml
id: blacksmith_conversation
initial: idle

states:
  idle:
    entry:
      effects:
        - say: "Ah, a traveler. What do you need?"
    actions:
      - id: greet
        label: "Hello."
        to: greeting

      - id: ask_work
        label: "Need any help?"
        to: work_offer
```

### State shape

```yaml
<state_id>:
  entry:                                # optional but typical
    effects:
      - <effect>
  terminal: true|false            # optional, default false
  actions:                        # optional if terminal
    - <transition>
```

### Entry shape

`entry` contains entry-time behavior.

The regular form is:

```yaml
entry:
  effects:
    - say: "Here you go."
    - transferItem:
        item: widget
        from: inventory
        to: player
    - broadcastToPlayer: "The blacksmith hands you a widget."
```

Entry operations may include:

- NPC speech ops such as `say`
- mutation ops such as `transferItem` or `setPlayerMetadata`
- render ops such as actor-targeted feedback

Likely convenience render shorthands include:

- `broadcastToPlayer`
- `broadcastToRoom`

These operations should use the same underlying mutation-op and render-instruction execution model already used by the runtime.

These shorthands are intended as author-facing sugar over the existing render-instruction model, not as a separate rendering semantics layer.

Broader broadcast scopes such as area-level variants may be possible later if designer use cases justify exposing them.

`entry` is state-entry behavior only.
It runs when the state is entered, not merely because the state exists.

### Transition shape

```yaml
- id: <action_id>                 # required, stable event id
  label: <menu text>              # required for UI surfaces
  to: <state_id>                  # required unless terminal routing model changes
  guard: <predicate ref>          # optional
  say: <player utterance>         # optional override
  effects:                        # optional
    - <effect>
```

Notes:

- `id` is the canonical event id
- `label` is UI-facing
- `say` overrides player transcript rendering
- `effects` are transition-time operations
- `to` names the destination state

Transition-local `effects` and state `entry` are both allowed.
They are not interchangeable:

- transition `effects` run because the edge was taken
- state `entry` runs because the destination state was entered

### Player transcript rules

- if `say` is present, use it
- otherwise, fall back to command-surface rendering

### Terminal states

```yaml
goodbye:
  entry:
    effects:
      - say: "Safe travels."
  terminal: true
```

Terminal states define no `actions`.

## DSL to SCXML Mapping

### State

DSL:

```yaml
idle:
  entry:
    effects:
      - say: "..."
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
- entry behavior remains declarative rather than arbitrary script

### Transition

DSL:

```yaml
- id: greet
  to: greeting
```

SCXML analogue:

```xml
<transition event="greet" target="greeting"/>
```

Restriction:

- single target only
- exact event match only

### Guard

DSL:

```yaml
guard: player.hasQuest("forge")
```

SCXML analogue:

```xml
<transition cond="..."/>
```

Restriction:

- not arbitrary script
- must resolve through a predefined predicate system

### Effects

DSL:

```yaml
effects:
  - grant_xp: 10
```

SCXML analogue:

```xml
<transition>
  <assign/>
</transition>
```

Restriction:

- declarative effect vocabulary only
- executed at commit time only

The intent is not to invent a DSL-only effect engine.
Conversation effects should lower to the same underlying runtime mutation operations and render instructions already used elsewhere in the system.

Audience-targeted render helpers such as `broadcastToPlayer` and `broadcastToRoom` may be appropriate initial DSL-facing convenience forms if they lower cleanly to the same runtime render instructions.

### Entry utterance

DSL:

```yaml
entry:
  effects:
    - say: "Hello."
```

SCXML analogue:

```xml
<onentry>...</onentry>
```

Restriction:

- string shorthand is allowed for simple NPC output
- richer entry behavior may use additional declarative ops
- no embedded arbitrary logic

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
- terminal states must not define `actions`
- non-terminal states should define `actions` and may warn if not

### Transition rules

- `id` is required and unique per state
- `to` must reference an existing state
- `label` is required
- duplicate `id` within the same state is forbidden
- the same `id` across different states is allowed

### Determinism rules

- transitions evaluate strictly in authored order
- no ambiguity resolution beyond order

### Forbidden combinations

- `terminal: true` with `actions`
- missing `to`
- empty `actions` on non-terminal states may warn

### Reachability

Recommended:

- all states reachable from `initial`

Unreachable states may warn rather than hard fail in early tooling.

## Worked Examples

### Greeting from idle

```yaml
idle:
  entry:
    effects:
      - say: "Ah, a traveler."
  actions:
    - id: greet
      label: "Hello."
      to: greeting
```

### Menu-driven branch

```yaml
greeting:
  entry:
    effects:
      - say: "What do you need?"
  actions:
    - id: buy
      label: "Show me your wares."
      to: shop

    - id: leave
      label: "Nothing."
      to: goodbye
```

### Directed `say <action> to <npc>`

Input surfaces:

- `1`
- `say buy to blacksmith`

Both resolve to:

```yaml
id: buy
```

The machine sees only event `buy`.

### Transition with player override

```yaml
- id: greet
  label: "Hello."
  say: "Hello there."
  to: greeting
```

### Transition fallback rendering

```yaml
- id: greet
  label: "Hello."
  to: greeting
```

Player transcript is derived from the command surface.

### Terminal conversation

```yaml
goodbye:
  entry:
    effects:
      - say: "Safe travels."
  terminal: true
```

### Auto-routing example if allowed

```yaml
greeting_router:
  entry: ""
  auto:
    - to: friendly
      guard: npc.isFriendly

    - to: hostile
      guard: npc.isHostile
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
- routing logic may leak into runtime or guard structure

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
- evaluated immediately on entry
- no effects allowed
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
- must enforce no effects

Preview implications:

- must render automatic routing distinctly from player-selectable actions

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
