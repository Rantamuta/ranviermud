# Conversation System Design

Status: draft

This document defines the architecture and implementation plan for the NPC conversation system used by the MUD. It consolidates earlier design work from `ConversationPlan.md` while incorporating the newer architectural decisions discussed during review.

The goal is to provide a **single authoritative design document** containing both:

- architectural principles
- concrete implementation mechanics

so the system can be implemented deterministically.

---

## 1. Goals

Implement a conversation system that:

- integrates with the existing command architecture
- uses semantic messaging for all visible output
- supports deterministic state progression
- is authorable by designers without scripting
- allows conversations to be previewed visually
- remains bundle-layer functionality rather than engine-level behavior

This document is scoped to conversation flow only.

General NPC internal state, autonomous NPC behavior, and external environmental event handling are explicitly out of scope unless later adopted through a separate design decision.

The system should be implementable by Codex with minimal ambiguity.

---

## 2. Core Principles

Conversation behavior follows these principles:

1. Conversations are **finite state machines**.
2. Player progress is **player-owned** rather than NPC-owned.
3. Conversations are **non-modal**.
4. Conversation content may be private while the **social context is visible**.
5. Menu UI is **private to the actor**.
6. Progression is driven by **actions**, not raw text parsing.
7. All output is rendered through **semantic messaging**.
8. Conversations follow the **standard command architecture phases**:

Receive Input → (Parse & Entity Resolution) → Capture → Plan → Commit → Render/Dispatch

All mutation occurs **before Render/Dispatch**.

---

## 3. Conversation Lifecycle

Typical interaction:

1. Player initiates conversation.
2. System determines the player’s current progress state.
3. NPC produces an opening line.
4. Player receives a private menu of actions.
5. Player selects an action.
6. Conversation FSM transitions.
7. NPC produces reply.
8. New menu appears or conversation ends.

Players may interrupt conversations at any time by issuing other commands.

Conversation may begin either through `talk <npc>` or through another supported command surface that resolves to an action available from the NPC's opening `idle` state for that actor.

---

## 4. Command Model

### Conversation Entry

Canonical command forms:

```
talk <npc>
talk to <npc>
```

Behavior:

- resolves NPC
- determines conversation progress state
- shows NPC entry line
- displays private action menu

Typing:

```
talk
```

may resume the most recent NPC conversation if the NPC is still present.

Aliases such as `speak`, `greet`, or `speak to` may be added later.

`talk <npc>` is one player-facing command surface for entering conversation.
It is not the only possible input surface.

Other command surfaces may later map to the same authored opening action as long as they resolve deterministically to the same conversation action.

---

### Menu Selection

When the most recent output is a conversation menu:

```
1) Who are you?
2) What is this place?
3) Goodbye.
```

may be typed directly to select actions.

```
> 1
```

#### Normative rules

- numeric input selects the corresponding visible menu option
- numeric input is interpreted as a selector only when a valid active conversation menu exists
- selector numbers map only to currently visible actions
- selectors apply only to the actor’s own engagement
- stale menus must be rejected

#### Scope and interpretation

Numeric selection is **not speech**.

Entering a number represents selecting a visible action from the conversation menu rather than speaking the number aloud.

If no conversation menu is active, numeric input is handled through normal command resolution.

#### Determinism requirements

For identical committed state:

- menu entry ordering must be identical
- numbering must be identical
- selector-to-action mapping must be identical

#### Input interception

The precise interception mechanism is **TBD**.

The runtime must provide a deterministic way to detect menu selector input before normal command parsing consumes it.

A likely implementation shape is a temporary **one-use input capture effect** associated with the active menu. Such a mechanism would:

- activate when a menu is displayed
- intercept the next matching input
- expire after the next input or a timeout
- invalidate automatically if the menu becomes stale

This mechanism may also be reused for other short-lived prompts such as **yes/no questions** originating from conversations or system interactions.

---

### Directed Action Speech

Conversation states expose **actions** that are invoked through directed speech.

The player-facing command surface and the conversation action surface are separate.

Player commands such as `say <action> to <npc>` are input surfaces.
The conversation machine itself cares about whether the current state for that actor exposes a matching action.

Canonical command form:

```
say <action> to <npc>
```

Example:

```
say mine to Foo
```

#### Normative rules

- directed action speech is a valid way to select a visible conversation action
- the action must match an action currently visible in the actor’s conversation state
- if directed speech resolves to an action in the current state, it may advance the conversation
- if directed speech does not resolve to an action in the current state, it does not advance the conversation unless some other authored behavior explicitly handles it
- actions have meaning only within the current conversation state

In FSM terms the action identifies the **transition edge** that moves the conversation from one state to the next.

#### Relationship to numeric selection

Numeric menu selection is a **convenience** for selecting the same action.

Example menu:

```
1) Where is the mine?
```

If the action defines:

```
action: mine
```

Then both inputs select the same action:

```
1
say mine to Foo
```

The runtime may resolve these through the same internal action selection path.

#### Transcript behavior

If directed action speech is intercepted successfully, the player's rendered utterance may be supplied either by the conversation or by the invoking command surface.

If the conversation supplies a richer player utterance for the selected action, that authored rendering should be used.

If the conversation does not supply such a rendering, the invoking command surface may fall back to its default semantic render.

The NPC's spoken reply is emitted when entering the destination state.

The NPC's utterance is not the conversation state itself.

#### Determinism requirements

For identical committed state:

- numeric selection and directed action speech must resolve to the same action
- the same action must produce the same transition, effects, transcript, and next menu

---

## 5. Player State and Persistence

Conversation progress is **stored on the player**.

Minimal persistence structure:

```yaml
conversationProgress:
  <npcId>:
    state: greeting
```

Optional variables:

```yaml
conversationProgress:
  <npcId>:
    state: mine
    vars:
      askedAboutCurse: true
```

Rules:

- keyed by NPC stable identity
- minimal data is NPC + state
- variables only exist if used

Conversation definitions may be reused across NPCs but **progress is per NPC identity**.

NPCs hosting conversations are assumed to have stable identities.

Disposable monsters or generic spawns are assumed not to host conversations.

---

## 6. Multi-Player Interaction

Conversation design must account for multiple players interacting with the same NPC.

Two concepts must be kept separate:

1. **authority** — whose input advances a conversation state
2. **visibility** — what each audience sees

---

### 6.1 Authority model

V1 uses **parallel per-player conversations**.

Rules:

- each player may hold an independent engagement with the same NPC
- conversation progress is **player-owned**, not NPC-owned
- one player’s selections do not block, replace, or advance another player’s conversation
- the NPC does not maintain a shared conversation cursor
- **no NPC-side conversation lock exists**

Anti-griefing is achieved through **interaction isolation**, not exclusivity.

---

### 6.2 Active conversation

A player is considered **actively conversing** with an NPC if they currently hold a valid engagement with that NPC.

Stored progress alone does not count.

---

### 6.3 Visibility model

Menus are always **actor-private**.

Conversation transcript visibility depends on how many players are actively conversing with the same NPC.

Rules:

- if **exactly one player** is conversing with an NPC, the full transcript is visible publicly
- if **two or more players** are conversing with the same NPC, bystanders do not see detailed transcript lines
- instead, bystanders receive an **aggregate social-context line**

Example aggregate line:

```
Foo speaks with Bar and Baz.
```

Actors always see their own full transcript and menu.

---

### 6.4 Deterministic visibility behavior

For identical committed state:

- active conversation participants must be computed identically
- the same audiences must receive transcript vs aggregate output
- participant ordering in aggregate messages must be deterministic

---

## 7. Conversation State Ownership

The **conversation runtime owns the FSM**.

NPCs simply host conversation definitions.

Benefits:

- deterministic logic
- reusable definitions
- easier validation

NPC scripts may react to conversation events but do not control the FSM.

Possible future hooks:

```
onConversationIntent
onConversationStateEnter
onConversationComplete
```

---

## 8. Conversation Binding

NPC metadata attaches conversations.

Example:

```yaml
conversation: squirrel
```

The runtime loads the definition when interaction begins.

If a player uses a supported opener command surface that resolves to an action available from the opening `idle` state, the runtime may begin the conversation by taking that transition immediately.

---

## 9. Authoring Model

Conversations are authored as **finite state machines**.

Every conversation must define the state:

```
idle
```

as the entry state.

### State Structure

States contain:

- entry behavior emitted or executed when entering the state
- available actions

State entry behavior runs on transition into that state.
It is not the state itself.

Entry behavior may include NPC speech, mutation, and render operations as long as their execution point is unambiguous: they run because the state was entered.

### Action Structure

Actions define transitions between states and separate two responsibilities:

- **transition input** via `action`
- **state progression** via `goto`

Fields:

- `id` — stable authoring identifier
- `action` — directed action token valid for this transition in the current state
- `guard` — condition controlling action visibility
- `effects` — transition-time operations applied because this edge was taken
- `goto` — destination conversation state

One action corresponds to one transition out of the current state.

Transition-local effects and destination-state entry behavior are both valid.
They answer different questions:

- transition effects describe what happens when the player chooses that action
- state entry behavior describes what happens when the machine arrives in the next state

Placement rule:

- if an effect depends on which action was taken, it belongs on the transition
- if it depends only on the destination state, it belongs on entry

Example:

```yaml
- id: chatting
    action: mine
      menu: Ask about the old mine.
      message: "{actor} {verb:say}, \"Tell me about the old mine, Old Miner!\""
      goto: mine

    action: foo
    ...
```

Menu numbers are generated automatically.

---

## 10. Guards and Effects

Actions separate three concerns:

- display
- gating
- mutation

Guards determine action availability.

Example:

```yaml
guard:
  hasItem: silver_coin
```

Effects apply on transition commit because the action edge was taken.

Example:

```yaml
effects:
  - takeItem:
      item: silver_coin
```

Rules:

- guards are read-only
- guards must not use render predicates
- effects apply only during Commit

---

## 11. Engagement Session

A temporary engagement object exists while menus are active.

Example:

```yaml
conversationActive:
  npcId: squirrel_01
  conversationId: squirrel
  state: greeting
  menu:
    1: ask_mine
    2: leave
```

Purpose:

- map numeric input to actions
- prevent stale selections

---

## 12. Menu Generation

Rules:

- actions failing guards are hidden
- remaining actions are renumbered

Example:

```
1. Ask about the mine
2. Goodbye
```

---

## 13. Menu Lifetime

Menus remain active until:

- a non-menu command is entered
- the player changes rooms
- the player disconnects
- the NPC despawns
- a new menu replaces the old

Menu revisions prevent stale selections.

### 13.1 Disconnect Cleanup

Active conversation engagement is ephemeral session state.

On player disconnect:

- clear the active engagement
- discard the active menu mapping and menu revision
- do not mutate persistent conversation progress
- do not emit transcript or room-visible output

No periodic cleanup mechanism is required for correctness.

---

## 14. Command Phase Integration

Conversation commands follow the standard command pipeline.

Conversation-specific veto behavior occurs during the **Capture** phase.

Determining whether player input resolves to a conversation action is a routing concern that happens before or alongside conversation-specific Capture checks.

Capture remains the phase for refusal, invalidation, or veto, not for inventing a conversation action where none was resolved.

---

### talk <npc>

Receive Input
parse command

Entity Resolution
resolve NPC

Capture
validate conversable

Plan
resolve conversation state
compute visible actions
prepare engagement

Commit
persist engagement

Render/Dispatch
emit NPC entry line
emit actor menu

---

### numeric selection

Receive Input
check active menu interception
capture numeric selector

Entity Resolution
resolve action from engagement menu

Capture
validate menu revision
validate engagement

Plan
evaluate guard
compute next state

Commit
persist state
apply effects

Render/Dispatch
emit NPC reply
emit actor menu

---

## 15. Failure Behavior

Conversation commands must produce deterministic outcomes when preconditions are not met.

Failures occur during the **Resolve** or **Capture** phases of the command pipeline.

Rules:

- failure must not mutate conversation progress
- failure must not mutate engagement state unless explicitly specified
- identical committed state and identical input must produce identical outcomes

Render/Dispatch is responsible for presenting any actor-visible feedback.

---

### 15.1 `talk <npc>` failures

#### Target not found

If the NPC cannot be resolved during the **Resolve** phase, the command fails through normal entity resolution behavior.

The conversation system does not handle this case.

No engagement is created.

---

#### Target not conversable

If the target resolves but does not host a conversation definition, the command fails during **Capture**.

Behavior:

- no engagement is created
- no conversation progress mutates
- actor receives an actor-visible refusal message

---

#### Target invalidated before Commit

If the resolved NPC becomes invalid before Commit (for example despawn or removal), the command fails.

Behavior:

- no engagement is created
- no conversation progress mutates
- actor receives an actor-visible message indicating the interaction cannot proceed

---

### 15.2 Numeric selection failures

Numeric selection failures occur only if the conversation system has intercepted the input.

If no active conversation menu exists, numeric input falls through to normal command resolution and is **not considered a conversation failure**.

---

#### Selector not present

If the selected number does not correspond to a visible action in the current menu:

Behavior:

- command fails
- engagement remains active
- conversation state does not change
- actor receives an actor-only error message

Room transcript must not be produced.

---

#### Menu is stale

If the selector references an outdated menu revision:

Behavior:

- command fails
- engagement remains active
- conversation state does not change
- actor receives an actor-only message

Room transcript must not be produced.

---

### 15.3 Directed action speech behavior

Directed speech of the form:

```
say <action> to <npc>
```

may be intercepted by the conversation system when the addressed NPC hosts a conversation whose current actor-specific state can receive that action.

Rules:

- directed action speech is a first-class conversation input path, not merely a shortcut for an already-open menu
- directed action speech may either initiate a conversation or continue an existing one
- interception is based on the addressed NPC's conversation state for that actor, not on the existence of an active menu or prior engagement
- an action is eligible when it matches an action the current state can receive for that actor
- if the addressed NPC does not host a conversation, or the current actor-specific state cannot receive that action, the conversation system does not intercept the command and speech proceeds through normal speech handling
- when directed action speech is intercepted successfully, the conversation runtime may establish or refresh engagement/menu state as needed

This preserves the diegetic meaning of speech commands.

If directed speech does not advance the conversation, an authored fall-through reaction may still respond without changing state when such behavior is supported by the conversation spec.

Such a fall-through reaction is distinct from state progression.

---

### 15.4 Engagement invalidation

If conversation input is intercepted but the engagement becomes invalid before the command reaches Commit:

Possible causes include:

- NPC despawn
- room change
- engagement cleared by another command
- engagement replaced by a new conversation

Behavior:

- command fails
- engagement is cleared
- conversation state does not mutate
- actor receives an actor-only message indicating the conversation has ended

No room transcript must be produced.

---

### 15.5 Determinism requirement

For identical committed state and identical input:

- the same failure condition must occur
- the same failure handling path must be taken
- the same actor-visible output must be produced
- no conversation progress must mutate

---

## 16. Semantic Messaging

All output is emitted via semantic events.

Types:

- public transcript
- NPC reply
- actor-only menu

Render must not mutate gameplay state.

---

## 17. Determinism Constraints

The conversation system must behave deterministically.

For **identical committed game state and identical input**, the system must produce identical outcomes.

Determinism is required so that:

- command execution remains reproducible
- debugging and replay are reliable
- automated testing is stable
- conversation authoring behaves predictably

Determinism requirements apply to **conversation logic, menu generation, command resolution, and output routing**.

---

### 17.1 Action visibility

For identical committed state:

- the same conversation state must be selected
- guard evaluation must produce the same visible action set
- the same actions must be hidden or visible

Guards must therefore depend only on deterministic read surfaces.

---

### 17.2 Menu generation

Menu construction must be deterministic.

For identical committed state:

- visible actions must appear in the same order
- menu numbering must be identical
- selector numbers must map to the same actions

Menu ordering must not depend on nondeterministic factors such as iteration order.

---

### 17.3 Intent resolution

Intent resolution must be deterministic.

For identical committed state and input:

- the same selector number must resolve to the same action
- numeric selection and directed action speech must resolve to the same action
- equivalent player-facing command surfaces must resolve to the same action when they represent the same authored conversation action

---

### 17.4 Conversation transitions

For identical committed state and resolved action:

- the same effects must be produced
- the same state transition must occur
- the same conversation progress must be persisted

State transitions must occur during **Commit** only.

---

### 17.5 Visibility routing

Conversation output routing must be deterministic.

For identical committed state:

- the same participants must be considered actively conversing
- the same audiences must receive transcript vs aggregate output
- aggregate participant ordering must be deterministic
- actor-only menu visibility must be identical

---

### 17.6 Failure outcomes

Failure behavior must also be deterministic.

For identical committed state and input:

- the same failure condition must occur
- the same failure handling path must execute
- the same actor-visible message must be produced
- conversation state must not mutate

---

### 17.7 Authoring constraints

Conversation definitions must not introduce nondeterminism.

Authors must not rely on:

- nondeterministic iteration
- random ordering
- mutable external state

Any nondeterministic mechanics must be introduced through explicit systems outside the conversation FSM.

---

This section resolves the remaining **determinism coverage gap** identified in the earlier comparison with the original design document.

### 18. Authoring Validation

Conversation definitions must validate:

- missing `idle`
- invalid `goto`
- unreachable states
- duplicate actions
- terminal states with actions

---

### 19. Preview Generation

Preview artifacts are generated from the conversation DSL.

They are review and inspection surfaces only.

Diagrams are derived preview artifacts, not authored or authoritative behavior definitions.

Source:

```
wizard.conversation.yml
```

Generated preview:

```
wizard.conversation.md
```

May include:

- readable state descriptions
- visible actions
- diagrams

---

### 20. Guard Read Surface

Guards read authoritative metadata but remain separate from render predicates.

Example:

```yaml
guard:
  worldMetaEquals:
    key: shrine.open
    value: true
```

---

### 21. Conversation vs NPC State

Conversation state and NPC internal state are separate.

This design document is scoped to conversation state only.

The following are explicitly out of scope here:

- general NPC internal state
- autonomous NPC behavior such as seeking shelter, fleeing danger, or patrol logic
- environmental or ambient events as conversation triggers
- broader NPC behavior orchestration outside player-engaged conversation

Initial implementation assumes **NPCs have no internal state**.

Internal state may later include:

- hostility
- trust
- fear

Conversation actions may eventually read or modify such metadata.

---

### 22. Implementation Test Planning

Tests should verify:

1. talk loads progress
2. numeric selection works
3. stale menu rejection
4. directed action speech progression
5. guard filtering
6. menu renumbering
7. movement clears engagement
8. NPC despawn invalidates session
9. talk resumes conversation
10. validation catches structural errors

---

### 23. Speculative Option: Delayed NPC-Driven Transition

This section is speculative and must be weighed before adoption.

Current mainline design assumes that a player's conversation action advances the conversation directly through the standard command pipeline.

A possible alternative is to make the exchange explicitly two-step and delayed by one or more ticks, as a timeout effect:

1. player command resolves to a conversation action
2. commit stores a pending response intent on the NPC
3. on the NPC's next eligible tick, the NPC consumes that pending response
4. the NPC commits a player-targeted conversation transition
5. that later player-targeted mutation advances conversation state, emits the NPC response, and installs the next menu

In that model, the symmetry would be:

- player command -> commit stores pending conversation response on NPC
- NPC timeout/tick -> commit stores player-targeted conversation transition

Possible pros:

- gives conversational pacing real gameplay time rather than treating delay as render-only
- preserves stronger actor separateness between player input and NPC response
- creates meaningful interruption windows before the NPC responds
- makes the next menu feel like part of the NPC's later reply rather than an immediate UI expansion
- may align better with future NPC pacing and response systems

Possible cons:

- significantly increases conversation-system complexity
- introduces cancellation and invalidation rules that must be specified precisely
- complicates ownership boundaries because player progress is player-owned while pending response timing would live on the NPC
- raises concurrency questions for multiple players engaging the same NPC close together
- may be more architecture than v1 needs

Questions to weigh if this option is pursued:

- should the NPC store a pre-resolved pending transition, or re-resolve the action at response time?
- what cancels the pending response: movement, despawn, disconnect, new input, state mismatch, or all of the above?
- should pending responses queue, replace one another, or be forbidden concurrently per player/NPC pair?
- should menu installation occur only with the delayed NPC reply, or earlier?

This option is intentionally deferred until the design team decides whether the pacing benefits justify the added complexity.

---

### 24. Future Extensions

Potential future features:

- richer guards
- reusable fragments
- editor tooling
- party-aware guards

These are intentionally deferred for v1.
