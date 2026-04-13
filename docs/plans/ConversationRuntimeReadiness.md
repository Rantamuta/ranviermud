# Conversation Runtime Readiness

- Status: active

## Purpose

This document records the current codebase readiness for implementing a bundle-layer conversation runtime.

For bring-up, this document treats directed speech such as `say <event> to <npc>` as the first executable conversation surface.

`talk` is treated as a later convenience entry surface layered on top of that runtime.

It is non-normative.

Its role is to:

- preserve the current survey of what already exists
- identify the major missing runtime pieces
- surface design and integration risks before implementation
- provide a basis for a more detailed implementation plan

This document does not authorize behavior changes by itself.

## Scope

This survey is about readiness for a bundle-layer conversation runtime in `bundle-rantamuta`.

It covers:

- command/input integration
- player and world state surfaces
- authoring/tooling surfaces
- existing NPC interaction patterns that may inform conversation implementation

It does not attempt to finalize the conversation design.

## Executive Summary

The repository has strong foundational infrastructure for a conversation runtime, but the runtime itself is still mostly absent.

The codebase is in a good position for an incremental V1 because the lower-level mechanics already exist:

- a shared command pipeline
- actor-general semantic rendering
- deterministic command syntax and entity resolution
- transactional metadata mutation
- draft conversation authoring/design documents
- basic authoring tooling for `.conversation.yml`

However, the main conversation-specific layer does not yet exist.

In particular, the following are still missing:

- a generic conversation runtime module
- active engagement/menu state
- numeric selector interception
- directed event speech interception
- runtime loading and semantic validation of authored conversation files
- effect/condition lowering from the draft conversation DSL
- a `talk` command as a later convenience surface

The result is that the repo is prepared for implementation, but not partially implemented in the sense of already having a reusable conversation engine.

## Existing Foundations

### Shared command pipeline

The command pipeline is already centralized and structured around parse, entity resolution, capture, plan, commit, and render phases.

Relevant code:

- `bundles/bundle-rantamuta/input-events/main.js`
- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`

Why this matters:

- directed speech interception can be added near the existing input and dispatch flow instead of inventing a second gameplay pipeline
- conversation-specific veto, planning, persistence, and rendering can fit into existing phase boundaries
- `talk` can later be implemented as a normal command surface rather than a one-off interaction path

### Actor-general semantic rendering

Semantic event rendering is already mature enough to support conversation transcript delivery.

Relevant code:

- `bundles/bundle-rantamuta/commands/say.js`
- `bundles/bundle-rantamuta/lib/session/render-dispatch.js`
- `bundles/bundle-rantamuta/lib/session/semantic-message.js`
- `docs/normative/SemanticMessaging.md`

Why this matters:

- conversation transcript can be expressed through existing semantic event delivery rather than direct `Broadcast.*`
- actor-visible versus room-visible transcript behavior can reuse existing render concepts
- NPC speech already has a canonical render path

### NPC dispatch through the same pipeline

NPCs can already dispatch intents through the same command pipeline used by players.

Relevant code:

- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`

Why this matters:

- conversation replies do not need a separate execution model for NPC output
- existing NPC guidance behavior demonstrates that authored or scripted NPC output can already flow through shared dispatch and rendering

### Deterministic syntax and entity resolution

The current syntax and entity-resolution layer is strong enough for likely conversation-facing command forms.

Relevant code:

- `bundles/bundle-rantamuta/lib/session/verb-local-syntax.js`
- `bundles/bundle-rantamuta/lib/session/entity-resolution.js`
- `bundles/bundle-rantamuta/tests/say.command.test.js`

Notable capabilities already present:

- relation-sensitive forms such as `say <text> to <npc>`
- `LIVING` target resolution
- `NUMBER` slot support in the syntax compiler

Why this matters:

- directed event speech such as `say <event> to <npc>` is already mechanically plausible at the parse/bind level
- `talk <npc>` and `talk to <npc>` can later fit the existing declaration model without requiring a separate parser shape
- numeric menu selection does not require a new tokenizer, though it still needs interception logic

### Transactional metadata storage

The repository already has read and write helpers for player metadata and broader metadata roots.

Relevant code:

- `bundles/bundle-rantamuta/lib/session/player-metadata.js`
- `bundles/bundle-rantamuta/lib/session/mutator.js`
- `bundles/bundle-rantamuta/lib/session/world-metadata-service.js`

Why this matters:

- persistent `conversations` can likely live in player metadata without inventing a new persistence substrate
- active runtime changes can be committed atomically through the existing mutation plan path
- rollback behavior is already part of the mutator contract

### Shared read-only query surface

A query facade already exists for deterministic, read-only state inspection.

Relevant code:

- `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`
- `docs/plans/ConversationDSL.md`
- `docs/plans/ConversationSystemDesign.md`

Current query surface already supports reads such as:

- room metadata
- area metadata
- world metadata
- actor inventory/effects/quests
- door state

Why this matters:

- the draft conversation DSL already expects conditions to lower into a shared read-only query surface
- this reduces pressure to invent a conversation-only predicate engine

### Conversation authoring and tooling groundwork

Conversation design and authoring work already exists in draft form.

Relevant docs:

- `docs/plans/ConversationSystemDesign.md`
- `docs/plans/ConversationDSL.md`
- `docs/plans/ConversationAuthoringToolingDesign.md`

Relevant tooling:

- `scripts/generate-conversation-mermaid.js`
- `scripts/watch-conversation-mermaid.js`
- `test/generate-conversation-mermaid.test.js`

Relevant authored sample:

- `docs/lore/kingDead.conversation.yml`

Why this matters:

- the project is not starting from a blank design space
- there is already a concrete draft authored surface to target
- there is already a sample authored conversation useful for characterization and runtime bring-up

### Existing scripted NPC interaction patterns

The repository already contains NPC interaction behaviors that are not conversations, but do exercise useful adjacent infrastructure.

Primary example:

- `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`

What this proves:

- NPCs can react to players and speak through the shared pipeline
- NPC scripts can persist per-player progress-like state in player metadata
- scenario-level tests can cover diegetic guidance flows

What it does not prove:

- there is no generic FSM conversation runtime behind Tomo
- there is no reusable menu/selection loop
- current NPC interaction remains script-driven rather than conversation-definition-driven

## Missing Runtime Pieces

### No `talk` command

There is currently no `talk` command implementation in `bundles/bundle-rantamuta/commands/`.

Impact:

- there is no player-facing command surface for conversation entry
- there is no baseline failure handling for `talk` or `talk to <npc>`

### No generic conversation runtime module

There is no bundle-layer runtime module that currently does the following:

- load a conversation definition for an NPC
- determine the actor's current conversation state
- evaluate visible events
- select transitions
- execute transition effects and `onEntry` behavior
- persist progress and engagement state
- emit actor-private menus

Impact:

- the authored DSL has no runtime consumer
- existing authored conversation files are review artifacts rather than runnable content

### No active engagement/menu state

The draft design expects ephemeral engagement state such as:

- active NPC
- active conversation relative path reference
- current visible menu mapping
- stale menu protection

No such implementation was found in the runtime.

Impact:

- numeric selection cannot work correctly
- menu invalidation rules cannot be enforced

### No numeric menu interception

The draft design explicitly leaves the interception mechanism as TBD.

Current input handling routes normal in-game input directly into the standard command path.

Impact:

- typing `1` cannot currently mean "choose menu option 1"
- stale selector rejection and one-use prompt capture are unimplemented

### No directed event speech interception

The draft design treats `say <event> to <npc>` as a first-class conversation input path when conversation logic chooses to intercept it.

Current `say` behavior only normalizes and renders speech.

Impact:

- addressed speech exists syntactically but does not yet route into conversation event selection
- conversation-specific `events.default` fallback behavior is not available

### No runtime loader and validator for conversation files

The current Mermaid generator parses `.conversation.yml` and performs only minimal validation needed for diagram generation.

What is missing:

- runtime loading policy
- semantic validation against the DSL draft
- validation of targets, conditions, effect shapes, final-state rules, and deterministic constraints

Impact:

- runtime consumption of authored conversation files would currently be underspecified and fragile

### No condition/effect lowering layer

The DSL draft assumes that authored conditions and effects lower into existing runtime read and mutation/render primitives.

No such lowering implementation currently exists.

Impact:

- authored `messageRoom`, `onEntry.effects`, `transitions`, `auto`, and `events.default` are not executable
- conversation DSL remains descriptive rather than runnable

### Query surface gaps

The sample King of the Dead conversation depends on condition reads such as `getActorMetadata`.

The current query facade does not expose actor metadata reads.

Impact:

- at least some authored conversation examples cannot yet be evaluated against the current query facade
- the runtime would need modest query-surface expansion even for early V1 bring-up

### No NPC-to-conversation binding in live area data

The design doc shows the intended binding shape:

```yaml
metadata:
  conversation: conversations/squirrel.conversation.yml
```

Binding invariants for planning:

- `metadata.conversation` is the authoritative conversation binding
- `metadata.conversation` refers to an area-local relative file path, not a separate conversation id
- the path resolves within the NPC's own area directory
- if `metadata.conversation` is absent, that NPC has no conversation
- there is no fallback from `npcId`

The surveyed area NPC YAML does not currently use that field.

Impact:

- there is no live content wiring path from an NPC definition to a conversation definition

### No conversation lifecycle cleanup/invalidation implementation

The draft design calls for invalidation on events such as:

- room change
- disconnect
- NPC despawn
- new menu replacement

No implementation was found for this lifecycle handling.

Impact:

- a future runtime must define ownership and cleanup carefully to avoid stale interaction state

### No conversation-specific tests

There are no existing tests for:

- `talk` success/failure surfaces
- menu generation
- numeric selector resolution
- stale menu rejection
- directed event speech interception
- active engagement invalidation

Impact:

- the implementation will need characterization and contract tests from the start

## Gaps Between Draft Design and Current Runtime

The draft design is fairly concrete, but several assumptions in the design still need an implementation seam in the real codebase.

### Input interception seam is not decided

The design expects menu interception before normal parsing consumes numeric input.

Current likely seam:

- `bundles/bundle-rantamuta/input-events/main.js`
- possibly `bundles/bundle-rantamuta/lib/session/command-dispatch.js`

Risk:

- if interception is bolted on too late in the flow, numeric selectors may conflict with normal command handling or error messaging

### Conversation state is player-owned but engagement is ephemeral

The design splits:

- persistent progress
- temporary active engagement

The current runtime has good support for persistence, but no clear home yet for ephemeral engagement state.

Risk:

- storing engagement in persistent metadata would be a poor fit
- storing it ad hoc on NPCs would conflict with the draft's player-owned authority model

### Transcript visibility rules are more complex than baseline speech

The design's multiplayer visibility rules require:

- actor-private menus
- public full transcript when one actor is conversing
- aggregate social-context messaging when multiple actors are conversing

Current semantic messaging is strong, but this specific audience computation does not yet exist.

Risk:

- a minimal V1 may need to defer aggregate transcript behavior or explicitly stage it after core conversation flow works

### Sample authored content exceeds current runtime reads

The sample conversation is useful, but it already assumes query capabilities and render/tag behavior beyond current runtime completeness.

Risk:

- using the full King of the Dead conversation as the first executable target may expand scope too early

## Readiness Assessment

### Overall

Readiness is good for starting implementation, but only if the first slice stays narrow.

Suggested confidence by area:

- command integration: high
- persistence primitives: high
- semantic rendering: high
- authoring/tooling groundwork: medium-high
- runtime execution layer: low
- live content wiring: low
- conversation-specific validation and tests: low

### Practical interpretation

The repository is not missing the hard infrastructure needed to support conversations.

It is missing the conversation-specific glue and execution layer.

That is a meaningful difference:

- this is not a greenfield engine problem
- but it is also not a small finishing task

## Checklist Hierarchy and Phases

This section frames the checklist relationship more explicitly.

Suggested hierarchy:

- root checklist item: `docs/plans/FoundationalRuntimesChecklist.md` -> `Conversation runtime for talk`
- direct child analysis/planning document: `docs/plans/ConversationRuntimeReadiness.md`
- direct implementation phases: the concrete sub-checklists below

These phases are intended as guideposts.

They are not yet a final implementation checklist, but they are stable enough to organize phased work.

### Cross-Cutting Validation

Tests and validation should not be treated as a final cleanup phase.

They are a cross-cutting obligation that should shape each implementation phase as it is designed, not after the runtime is already built.

Why this matters:

- test planning helps expose ambiguity in the runtime contract early
- deterministic validation pressures the design toward cleaner seams
- each phase should prove the behavior it introduces before later phases build on it

Recommended posture:

- define the expected evidence for each phase before implementation begins
- add characterization tests when a current behavior or fallback path is unclear
- keep validation close to the phase that introduces the behavior
- avoid leaving major conversation behaviors untested until end-to-end work

Examples of phase-aligned validation:

- conversation state and persistence: progress storage, active engagement storage, and non-persistence of ephemeral state
- authored conversation loading: load failures, unsupported construct failures, and stable definition lookup
- event evaluation runtime: authored-order transition selection, `default` fallback, `auto`, and `final` behavior
- directed event speech integration: `say <event> to <npc>` interception, opener behavior, continuation behavior, and correct fallthrough to normal speech
- menu runtime: deterministic numbering, selector mapping, and stale-menu rejection
- input interception: numeric interception and correct fallthrough when no conversation route matches
- effect and query lowering: condition evaluation, effect lowering, and failure behavior for unsupported effect/query shapes
- lifecycle and invalidation: cleanup on disconnect, room change, despawn, and replaced engagement
- `talk` entry surface: command forms, target failures, conversable failures, and parity with the already-runnable directed speech path
- multiplayer visibility policy: actor-private menu behavior and transcript visibility rules

### Phase 1: Conversation state and persistence

- Status: archived

Scope:

- persistent player-owned conversation progress
- conversation progress stored under `conversations.<areaId>.<npcId>.state`
- extensible per-NPC conversation state shape for future fields such as visited transitions or conversation-local variables
- specific-NPC interaction resumes from persisted conversation state when prior progress exists
- ephemeral active engagement state kept separate from persistent progress
- explicit distinction between area-local `npcId` and globally unique `npcRef`
- minimal runtime ownership model for player-owned state

Why it stands alone:

- this is the state model that the rest of the runtime depends on
- it should be settled before broader behavior grows around it

Illustrative persistent shape:

```json
{
  "conversations": {
    "<areaId>": {
      "<npcId>": {
        "state": "<stateId>"
      }
    }
  }
}
```

Terminology note:

- `npcId` means the area-local authored NPC id
- `npcRef` means the logical unique authored NPC reference `<areaId>:<npcId>`
- persisted metadata should key progress by nested `areaId` and `npcId` segments rather than storing raw `npcRef` as a single `a:b` key segment

Resume note:

- in this document, "resume" for core runtime purposes means loading the persisted conversation state for a specifically identified NPC when the player interacts with that NPC again
- this is part of the main persistence contract
- this is distinct from deferred bare-`talk` / "most recent conversation" resume behavior, which remains part of the later `talk` command-surface discussion

Validation:

- unit tests for player metadata helpers that prove `conversations.<areaId>.<npcId>.state` can be read and written without mutating unrelated metadata branches
- unit tests for any conversation-state helper layer that prove persistent progress and ephemeral engagement are stored separately
- unit tests that prove NPC reference resolution distinguishes same-named NPC ids in different areas and does not collapse them onto one persistence path
- unit tests that prove unknown area/NPC combinations return no persisted conversation state rather than fabricating defaults silently
- unit tests that prove interacting with a specifically identified NPC resumes from `conversations.<areaId>.<npcId>.state` when prior progress exists and falls back to authored `initial` only when no persisted state exists
- integration or command-dispatch tests that prove conversation progress survives across multiple commands while ephemeral engagement can be cleared without touching persistent state
- pass condition: tests demonstrate the repository has one stable persistent shape for player-owned conversation progress and one separate home for temporary engagement state

### Phase 2: Authored conversation loading

- Status: archived

Scope:

- loading `.conversation.yml`
- runtime binding from NPC data to a conversation definition
- minimal structural/runtime validation on load
- clear unsupported-construct failure behavior

Phase 2 binding invariants:

- NPC conversation binding is explicit through `metadata.conversation`
- `metadata.conversation` refers to an area-local relative file path, not a separate conversation id
- the path resolves within the NPC's own area directory
- if `metadata.conversation` is absent, that NPC is non-conversable
- there is no fallback from `npcId`
- a present `metadata.conversation` that does not resolve to a valid supported conversation file must log an explicit maintainer-facing error, present only a generic no-response line to the player, and create no engagement or progress mutation

Why it stands alone:

- the runtime needs a real authored source to execute
- live NPC wiring should not be mixed implicitly into command logic

Validation:

- unit tests for the loader that prove a valid minimal `.conversation.yml` file loads into a deterministic runtime definition
- unit tests that prove NPC metadata binding resolves the intended area-local relative conversation path deterministically, treats absent `metadata.conversation` as non-conversable, and for broken path references logs an explicit error while returning only the generic no-response behavior to the player-facing path
- unit tests that prove unsupported or malformed authored files fail with explicit diagnostics instead of partial runtime behavior
- tooling-parity tests where practical so the runtime loader and existing Mermaid/tooling expectations do not silently diverge on the supported minimal shape
- pass condition: one minimal authored conversation can be loaded and bound deterministically, and invalid definitions fail before command execution begins

### Phase 3: Event evaluation runtime

- Status: active

Scope:

- resolve current state
- compute visible events
- evaluate guarded transitions in authored order
- support `onEntry`, `auto`, `default`, and `final`

Why it stands alone:

- this is the actual FSM execution core
- it should be testable apart from command-surface concerns

Validation:

- unit tests for initial state resolution from persisted progress versus authored `initial`
- unit tests for visible-event computation that prove authored order is preserved after condition filtering
- unit tests for guarded transition selection that prove the first passing transition wins in authored order
- unit tests for `default`, `auto`, and `final` behavior, including no-transition cases and final-state termination behavior
- trace-oriented tests, if the runtime exposes a trace object, that prove the selected state, event, transition, and destination are all inspectable deterministically
- pass condition: identical authored definition, player state, and input event always yield the same selected transition, state result, and visible event set

### Phase 4: Directed event speech integration

- Status: draft

Scope:

- intercept directed speech for `say <event> to <npc>` when the addressed NPC hosts a conversation whose current actor-specific state can receive that event
- allow directed speech to act as the first executable opener and continuation surface during runtime bring-up
- support opener behavior such as `say hello to <npc>` when `hello` is an authored event available from that NPC's current conversation state
- support authored hidden `events.default` fallback when no exact event matches but the current state defines `events.default`
- preserve fallback to normal speech when no conversation route matches

Why it stands alone:

- this provides a real player-visible execution surface without depending on `talk`
- it keeps early runtime testing aligned with the already-existing `say` command path

Validation:

- command integration tests for `say <event> to <npc>` that prove a matching conversation event is intercepted and routed into the conversation runtime
- command integration tests that prove when no exact event matches, an authored hidden `events.default` fallback is taken and routed into the conversation runtime
- command integration tests that prove a non-matching `say <event> to <npc>` falls back to normal `say` behavior without mutating conversation state
- command integration tests that prove an opener such as `say hello to <npc>` can bootstrap a conversation when `hello` is a valid authored event for that actor/NPC pair
- regression tests that prove ordinary free speech and addressed speech to non-conversable NPCs still behave exactly like normal `say`
- pass condition: directed speech becomes a reliable opener and continuation surface for conversations, including authored `events.default` fallback behavior, without breaking the existing speech command when no conversation route applies

### Phase 5: Effect and query lowering

- Status: draft

Scope:

- lowering authored conditions to the shared query facade
- lowering authored instructions to existing mutation/render primitives
- expanding query facade only where real authored need requires it
- supporting the narrow authored subset needed for the first runnable directed-speech conversation slices

Why it stands alone:

- this is the bridge between the drafted DSL and the actual runtime
- it can easily sprawl if it is not treated as its own bounded workstream

Validation:

- unit tests for supported condition shapes that prove they lower to deterministic reads against the shared query facade
- unit tests for supported effect shapes that prove they lower to the existing mutation and render primitives without conversation-local side channels
- unit tests for unsupported condition or effect shapes that prove the runtime fails explicitly and does not partially mutate state
- integration tests that prove a small authored conversation can produce the expected line output and committed state changes through lowered effects
- pass condition: every supported authored construct in the first runnable subset has a direct tested lowering path, and unsupported constructs fail predictably before corrupting runtime behavior

### Phase 6: Menu runtime

- Status: draft

Scope:

- actor-private menu generation
- deterministic event ordering and numbering
- menu mapping from selector to event
- stale-menu protection and menu revision handling

Why it stands alone:

- the menu loop is distinct from the state machine itself
- menu numbering and stale-menu behavior are major correctness concerns

Validation:

- unit tests for visible-event-to-menu mapping that prove numbering is deterministic and follows authored event order after filtering
- unit tests that prove hidden events are excluded and remaining events are renumbered compactly
- integration tests that prove the actor receives a private menu after a successful conversation step and that the menu maps selectors back to the intended event ids
- tests for menu revision handling that prove replacing a menu invalidates older selector mappings
- pass condition: the same committed state always produces the same actor-private menu text, numbering, and selector mapping

### Phase 7: Numeric input interception

- Status: draft

Scope:

- numeric selector interception before normal command handling consumes the input
- safe fallthrough when no conversation route matches
- explicit separation between numeric selection and spoken conversation events

Why it stands alone:

- this is where menu-driven conversation begins to interact with the broader input model
- it is the most likely place for dispatch-layer regressions if rushed

Validation:

- command-dispatch tests that prove numeric input is intercepted only when a valid active conversation menu exists
- command-dispatch tests that prove selector numbers resolve to the current menu mapping and do not leak across players or stale revisions
- fallthrough tests that prove numeric input with no active menu continues through normal command handling exactly as before
- regression tests that prove numeric interception does not alter unrelated command parsing or unknown-command behavior
- pass condition: numeric selection works only for the actor's active menu and leaves the broader input model unchanged when no menu applies

### Phase 8: Lifecycle and invalidation

- Status: draft

Scope:

- clearing engagement on room change
- clearing engagement on disconnect
- clearing engagement on NPC despawn or menu replacement
- preventing stale interaction state from mutating progress

Why it stands alone:

- the draft design depends on ephemeral engagement behaving predictably
- this work is easy to defer accidentally even though it matters for correctness

Validation:

- integration tests that prove room change clears active engagement without mutating persistent conversation progress
- integration tests that prove disconnect cleanup discards ephemeral engagement and menu state without emitting transcript output
- integration or script-level tests that prove NPC despawn or replacement invalidates the engagement before any further conversation mutation can occur
- stale-state tests that prove invalidated engagements fail safely and do not advance the conversation state
- pass condition: all declared invalidation triggers reliably clear temporary interaction state while preserving committed persistent progress

### Phase 9: Multiplayer visibility policy

- Status: draft

Scope:

- actor-private menu behavior
- transcript visibility rules for one active participant
- aggregate social-context rendering for multiple active participants

Why it stands alone:

- this is a meaningful behavior layer beyond basic conversation correctness
- it may be appropriate to defer parts of it until after a minimal single-actor loop works

Validation:

- render-dispatch integration tests for the single-active-participant case that prove full transcript remains publicly visible while menus remain actor-private
- multiplayer integration tests for the multi-active-participant case that prove bystanders receive aggregate social-context output instead of detailed transcript lines
- determinism tests that prove active-participant computation and aggregate participant ordering are stable for identical committed state
- privacy tests that prove one actor never receives another actor's private menu
- pass condition: transcript and menu visibility obey the authored social rules consistently for one-actor and many-actor cases

### Phase 10: `talk` entry surface

- Status: draft

Scope:

- baseline `talk <npc>`
- baseline `talk to <npc>`
- deterministic failure messaging for missing or invalid targets
- parity with the already-runnable directed speech path instead of introducing a separate conversation bootstrap model

Why it stands alone:

- `talk` is a convenience/player-facing wrapper, not the minimal runtime prerequisite
- deferring it avoids building a command shell before the underlying conversation execution path exists

Validation:

- command integration tests for `talk <npc>` and `talk to <npc>` success paths that prove they enter the same runtime path already exercised by directed speech
- command integration tests for missing target, unresolved target, and non-conversable target failures with deterministic actor-visible messaging
- parity tests that prove `talk` does not invent a second bootstrap model and reaches the same current-state/menu behavior as the established conversation runtime
- regression tests that prove adding `talk` does not change `say <event> to <npc>` behavior
- if bare `talk` or "most recent conversation" resume behavior is ever brought back into scope later, add dedicated tests for that surface rather than folding it implicitly into the `talk <npc>` / `talk to <npc>` contract
- pass condition: `talk` becomes a convenience entry surface layered on top of the existing conversation runtime rather than a divergent implementation path

## Phase-Shaped Grouping

If the project shifts toward a phased approach, the implementation phases above group naturally into these broader guidepost phases.

### Phase 1: Bring-up

Primary phases:

- Conversation state and persistence
- Authored conversation loading
- Event evaluation runtime
- Directed event speech integration
- Effect and query lowering

Intent:

- prove that an authored conversation can load and advance through `say <event> to <npc>` before any menu or `talk` convenience surface exists

### Phase 2: Core loop

Primary phases:

- Menu runtime
- Numeric input interception
- Cross-cutting validation for the core loop

Intent:

- prove that the authored machine can advance deterministically through menu selection

### Phase 3: Input integration

Primary phases:

- `talk` entry surface
- Cross-cutting validation around interception and fallthrough

Intent:

- add a dedicated conversation entry command only after the underlying runtime already works through directed speech

### Phase 4: Authored execution expansion

Primary phases:

- Query facade expansion driven by real authored need

Intent:

- make a practical authored subset of the drafted DSL runnable

### Phase 5: Robustness and social behavior

Primary phases:

- Lifecycle and invalidation
- Multiplayer visibility policy
- Cross-cutting end-to-end validation

Intent:

- align the minimal runtime with the broader draft design and multiplayer correctness expectations

## Suggested V1 Slice Order

This is not a final implementation plan.

It is a readiness-informed suggestion for how to keep the work incremental and reversible.

### Slice 1: Minimal runtime skeleton plus directed speech

Goal:

- prove that an authored conversation can load and advance through `say <event> to <npc>`

Likely work:

- define NPC conversation binding shape
- load a minimal conversation definition
- persist minimal `conversations.<areaId>.<npcId>.state`
- implement the minimal runtime needed to resolve current state and take one directed event
- support the narrow condition/effect/render subset required for opening and reply lines
- intercept directed speech only when a matching event exists and otherwise preserve normal `say`

### Slice 2: Menu runtime and numeric selection

Goal:

- allow deterministic selection of visible menu options by number

Likely work:

- add actor-private menu generation
- add menu interception seam
- implement menu mapping and stale-menu rejection
- commit next state and render next menu

### Slice 3: Query facade expansion and richer authored lowering

Goal:

- support the first real authored conversations without conversation-local read hacks

Likely work:

- add actor metadata reads
- add any additional deterministic reads justified by real authored content
- support additional guarded transitions and authored instruction forms as real content requires

### Slice 4: Richer lifecycle and multiplayer behavior

Goal:

- align more closely with the full draft design

Likely work:

- invalidation on room change/despawn/disconnect
- multiplayer transcript visibility rules
- aggregate social-context line behavior

### Slice 5: `talk` command surface

Goal:

- add `talk` as a dedicated conversation entry command after the runtime is already proven through directed speech

Likely work:

- add baseline `talk <npc>` and `talk to <npc>`
- keep `talk` behavior aligned with the same conversation runtime used by directed speech
- validate missing-target, non-conversable-target, and success-path behavior without inventing a second conversation bootstrap flow

## Risks and Open Questions

### Where should ephemeral engagement live?

The current design space suggests player/session-owned ephemeral state rather than NPC-owned state.

This should be settled early because it affects:

- invalidation
- multiplayer behavior
- disconnect cleanup
- stale menu handling

### How much of the draft design belongs in V1?

The full draft includes:

- numeric selection
- directed event speech
- fallback transitions
- multiplayer transcript rules
- invalidation behavior

Trying to land all of that in one slice would raise risk significantly.

### Should the first runnable conversation be synthetic or diegetic?

A very small test conversation may be a safer first executable target than the full King of the Dead conversation.

Reason:

- the sample King of the Dead conversation already exercises metadata reads, guarded transitions, and richer text/render features

### How strict should runtime validation be initially?

The tooling draft expects semantic validation, but runtime bring-up may need a staged approach.

Open question:

- what validation failures should be hard errors at runtime load
- what failures should remain tooling-time only during early implementation

## Traceability to Undying Village

This readiness note exists primarily to support the checklist item in:

- `docs/plans/FoundationalRuntimesChecklist.md`

Most directly related checklist items:

- `Conversation runtime for talk`
- `Implement talk command support for reference-world conversation entry`
- `Add deterministic tests for talk`

Readiness note:

- even though the current checklist language names `talk`, this readiness document now treats `talk` as a later convenience surface
- the first runnable/testing surface for conversation runtime bring-up is directed speech via `say <event> to <npc>`

This note also interacts with adjacent checklist work:

- per-player state helpers
- derived-state evaluators
- read-only predicate/render surfaces

Those adjacent items matter because real Undying Village conversation content will likely depend on them even if the generic runtime can be implemented before they are complete.

## Recommendation

The next planning step should be a dedicated implementation plan that:

- defines the first accepted V1 behavior surface
- names the exact runtime modules to be introduced or extended
- stages the work into reversible slices
- makes validation requirements explicit

Recommended posture:

- start with minimal directed speech plus the runtime needed to make it real
- treat `npcRef = <areaId>:<npcId>` as the logical unique NPC identity while storing progress under `conversations.<areaId>.<npcId>.state`
- avoid full draft-design scope in the first slice
- use a very small authored conversation for bring-up
- defer `talk` until the underlying runtime is already working
- expand query/effect support only in response to real authored need

That approach best matches the current readiness profile of the repository.
