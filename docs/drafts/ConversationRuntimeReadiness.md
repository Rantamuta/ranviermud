# Conversation Runtime Readiness

Status: draft

## Purpose

This document records the current codebase readiness for implementing a conversation runtime centered on `talk`.

It is non-normative.

Its role is to:

- preserve the current survey of what already exists
- identify the major missing runtime pieces
- surface design and integration risks before implementation
- provide a basis for a more detailed implementation plan

This document does not authorize behavior changes by itself.

## Scope

This survey is about readiness for a bundle-layer conversation runtime in `bundle-rantamuta`:

- `Conversation runtime for talk`

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

- a `talk` command
- a generic conversation runtime module
- active engagement/menu state
- numeric selector interception
- directed event speech interception
- runtime loading and semantic validation of authored conversation files
- effect/condition lowering from the draft conversation DSL

The result is that the repo is prepared for implementation, but not partially implemented in the sense of already having a reusable conversation engine.

## Existing Foundations

### Shared command pipeline

The command pipeline is already centralized and structured around parse, entity resolution, capture, plan, commit, and render phases.

Relevant code:

- `bundles/bundle-rantamuta/input-events/main.js`
- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`

Why this matters:

- `talk` can be implemented as a normal command surface rather than a one-off interaction path
- conversation-specific veto, planning, persistence, and rendering can fit into existing phase boundaries
- conversation interception can be added near the existing input and dispatch flow instead of inventing a second gameplay pipeline

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

- `talk <npc>` and `talk to <npc>` fit the existing declaration model
- directed event speech such as `say <event> to <npc>` is already mechanically plausible at the parse/bind level
- numeric menu selection does not require a new tokenizer, though it still needs interception logic

### Transactional metadata storage

The repository already has read and write helpers for player metadata and broader metadata roots.

Relevant code:

- `bundles/bundle-rantamuta/lib/session/player-metadata.js`
- `bundles/bundle-rantamuta/lib/session/mutator.js`
- `bundles/bundle-rantamuta/lib/session/world-metadata-service.js`

Why this matters:

- persistent `conversationProgress` can likely live in player metadata without inventing a new persistence substrate
- active runtime changes can be committed atomically through the existing mutation plan path
- rollback behavior is already part of the mutator contract

### Shared read-only query surface

A query facade already exists for deterministic, read-only state inspection.

Relevant code:

- `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`
- `docs/drafts/ConversationDSL.md`
- `docs/drafts/ConversationSystemDesign.md`

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

- `docs/drafts/ConversationSystemDesign.md`
- `docs/drafts/ConversationDSL.md`
- `docs/drafts/ConversationAuthoringToolingDesign.md`

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
- there is no baseline failure handling for `talk`, `talk to <npc>`, or bare `talk`

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
- active conversation id
- current visible menu mapping
- stale menu protection

No such implementation was found in the runtime.

Impact:

- numeric selection cannot work correctly
- menu invalidation rules cannot be enforced
- resume behavior cannot be implemented cleanly

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

- `conversation: <id>`

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
- resume behavior
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
- direct child analysis/planning document: `docs/drafts/ConversationRuntimeReadiness.md`
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

- conversation entry surface: command forms, target failures, conversable failures, and basic success path
- conversation state and persistence: progress storage, active engagement storage, and non-persistence of ephemeral state
- authored conversation loading: load failures, unsupported construct failures, and stable definition lookup
- event evaluation runtime: authored-order transition selection, `default` fallback, `auto`, and `final` behavior
- menu runtime: deterministic numbering, selector mapping, and stale-menu rejection
- input interception: numeric interception, addressed-speech interception, and correct fallthrough when no conversation route matches
- effect and query lowering: condition evaluation, effect lowering, and failure behavior for unsupported effect/query shapes
- lifecycle and invalidation: cleanup on disconnect, room change, despawn, and replaced engagement
- multiplayer visibility policy: actor-private menu behavior and transcript visibility rules

### Phase 1: Conversation entry surface

Scope:

- baseline `talk <npc>`
- baseline `talk to <npc>`
- optional bare `talk` resume behavior
- deterministic failure messaging for missing or invalid targets

Why it stands alone:

- this is the player-facing door into the system
- it can be implemented before richer menu and event-routing behavior

### Phase 2: Conversation state and persistence

Scope:

- persistent `conversationProgress`
- ephemeral active engagement state
- stable NPC/conversation identity assumptions
- minimal runtime ownership model for player-owned state

Why it stands alone:

- this is the state model that the rest of the runtime depends on
- it should be settled before broader behavior grows around it

### Phase 3: Authored conversation loading

Scope:

- loading `.conversation.yml`
- runtime binding from NPC data to a conversation definition
- minimal structural/runtime validation on load
- clear unsupported-construct failure behavior

Why it stands alone:

- the runtime needs a real authored source to execute
- live NPC wiring should not be mixed implicitly into command logic

### Phase 4: Event evaluation runtime

Scope:

- resolve current state
- compute visible events
- evaluate guarded transitions in authored order
- support `onEntry`, `auto`, `default`, and `final`

Why it stands alone:

- this is the actual FSM execution core
- it should be testable apart from command-surface concerns

### Phase 5: Menu runtime

Scope:

- actor-private menu generation
- deterministic event ordering and numbering
- menu mapping from selector to event
- stale-menu protection and menu revision handling

Why it stands alone:

- the menu loop is distinct from the state machine itself
- menu numbering and stale-menu behavior are major correctness concerns

### Phase 6: Input interception

Scope:

- numeric selector interception before normal command handling consumes the input
- directed event speech interception for `say <event> to <npc>`
- safe fallthrough when no conversation route matches

Why it stands alone:

- this is where conversation begins to interact with the broader input model
- it is the most likely place for dispatch-layer regressions if rushed

### Phase 7: Effect and query lowering

Scope:

- lowering authored conditions to the shared query facade
- lowering authored effects to existing mutation/render primitives
- expanding query facade only where real authored need requires it

Why it stands alone:

- this is the bridge between the drafted DSL and the actual runtime
- it can easily sprawl if it is not treated as its own bounded workstream

### Phase 8: Lifecycle and invalidation

Scope:

- clearing engagement on room change
- clearing engagement on disconnect
- clearing engagement on NPC despawn or menu replacement
- preventing stale interaction state from mutating progress

Why it stands alone:

- the draft design depends on ephemeral engagement behaving predictably
- this work is easy to defer accidentally even though it matters for correctness

### Phase 9: Multiplayer visibility policy

Scope:

- actor-private menu behavior
- transcript visibility rules for one active participant
- aggregate social-context rendering for multiple active participants

Why it stands alone:

- this is a meaningful behavior layer beyond basic conversation correctness
- it may be appropriate to defer parts of it until after a minimal single-actor loop works

## Phase-Shaped Grouping

If the project shifts toward a phased approach, the implementation phases above group naturally into these broader guidepost phases.

### Phase 1: Bring-up

Primary phases:

- Conversation entry surface
- Conversation state and persistence
- Authored conversation loading

Intent:

- prove that a player can enter a real conversation definition through `talk`

### Phase 2: Core loop

Primary phases:

- Event evaluation runtime
- Menu runtime
- Cross-cutting validation for the core loop

Intent:

- prove that the authored machine can advance deterministically through menu selection

### Phase 3: Input integration

Primary phases:

- Input interception
- Cross-cutting validation around interception and fallthrough

Intent:

- integrate conversations cleanly with the wider command/input model

### Phase 4: Authored execution expansion

Primary phases:

- Effect and query lowering
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

### Slice 1: Minimal runtime skeleton plus `talk`

Goal:

- prove that a player can `talk` to a conversable NPC and receive an opening line plus actor-private menu

Likely work:

- add baseline `talk` command surface
- define NPC conversation binding shape
- load a minimal conversation definition
- persist minimal `conversationProgress`
- install minimal active engagement state

### Slice 2: Numeric selection loop

Goal:

- allow deterministic selection of visible menu options by number

Likely work:

- add menu interception seam
- implement menu mapping and stale-menu rejection
- commit next state and render next menu

### Slice 3: Directed event speech interception

Goal:

- allow `say <event> to <npc>` to drive conversation when applicable

Likely work:

- intercept addressed speech only when a matching event exists
- preserve fallback to normal speech when no conversation event matches

### Slice 4: Condition/effect lowering

Goal:

- make a useful authored subset of the DSL runnable

Likely work:

- support basic event targets
- support guarded transitions
- support `onEntry.effects`
- support a narrow render/effect vocabulary

### Slice 5: Query facade expansion

Goal:

- support the first real authored conversations without conversation-local read hacks

Likely work:

- add actor metadata reads
- add any additional deterministic reads justified by real authored content

### Slice 6: Richer lifecycle and multiplayer behavior

Goal:

- align more closely with the full draft design

Likely work:

- invalidation on room change/despawn/disconnect
- resume behavior
- multiplayer transcript visibility rules
- aggregate social-context line behavior

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

- start with minimal `talk` plus menu runtime
- avoid full draft-design scope in the first slice
- use a very small authored conversation for bring-up
- expand query/effect support only in response to real authored need

That approach best matches the current readiness profile of the repository.
