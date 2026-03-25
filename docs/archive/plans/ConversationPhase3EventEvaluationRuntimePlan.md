# Conversation Phase 3 Event Evaluation Runtime Plan

## Status

- Status: archived
- Scope: formal plan for the conversation event evaluation runtime

## Goal

Create the first runnable conversation-machine core for `bundle-rantamuta`.

This phase should let the runtime look at one already-loaded conversation definition, determine where one player currently is in that conversation with one NPC, decide what events are available, and choose the next state in a fully predictable way.

## Intent

This plan is about the conversation "brain", not the player-facing command shell.

In plain terms:

- the runtime should know which conversation state a player is in with a specific NPC
- it should know which choices are currently available
- when given one event name, it should choose the right authored outcome
- it should follow state-entry behavior and automatic routing exactly as the authored file says
- it should report what it decided in a structured trace, meaning a machine-readable record of the steps it took

This phase should stay read-only and side-effect free at its core.

Here, "read-only and side-effect free" means:

- no command interception
- no direct world mutation
- no menu installation
- no message dispatch
- no implicit fallback that silently rewrites player progress

It may return data that later phases will use to mutate state or render output, but this phase itself should only evaluate and describe the authored machine.

## In Scope

- Add one runtime-owned conversation evaluation module under `bundles/bundle-rantamuta/lib/session/`.
- Resolve the current conversation state for a specific player and specific NPC by:
  - using persisted conversation state from `player.metadata.conversations.<areaId>.<npcId>.state` when present
  - otherwise using the authored `initial` state from the loaded conversation definition
- Define one stable input shape for the evaluator that includes:
  - the loaded conversation definition
  - the player, used only as a read-only source for persisted conversation progress and any read-only condition inputs needed in this phase
  - the NPC reference (`npcRef`, meaning the stable authored identity `<areaId>:<npcId>`)
  - either no event id for inspection of the current state, or one exact authored event id when an event is being evaluated
  - any injected helper needed for read-only condition checks against the shared `q.*` query surface
- Define one stable output shape for the evaluator that includes:
  - source state
  - selected event, if any
  - selected transition, if any
  - destination state, meaning the immediate state entered from the selected event or `default`
  - settled state, meaning the final current state after any `onEntry` work and any `auto` routing finish
  - whether the settled state is final
  - visible events in authored order
  - transition effects and state-entry effects as returned data only
  - a structured trace of the evaluation steps
- Compute visible events in the order they are written in the authored file.

Here, "visible events" means authored events that:

- are not the reserved hidden `default` fallback
- pass their own read-only condition, when one is present
- remain in the same authored order after filtering

- Support exact event matching by authored event id.
- Support the single-transition event form:
  - one event
  - optional condition
  - optional effects
  - one target state
- Support the guarded `transitions:` form:
  - evaluate transitions in authored order
  - first passing transition wins
- Support hidden `events.default` fallback when:
  - no exact event in the current state produced a selected transition
  - the default condition, if present, passes
- Support state `onEntry.effects` as returned data only.
- Support `auto` routing after `onEntry`.

Here, "`auto` routing" means an authored automatic move to another state after entering the current state, without waiting for another player choice.

For this phase, `auto` settling must be deterministic:

- fail explicitly if the same state is revisited in one `auto` chain
- also fail explicitly if one evaluation step exceeds a hard cap of 32 `auto` hops
- record the visited states and the failure reason in the trace

- Support final states.

Here, "final state" means an authored permanent end state for that conversation path, not merely "goodbye for now".

- Define failure behavior for persisted progress drift.

Here, "persisted progress drift" means player metadata points at a state id that no longer exists in the currently loaded conversation definition.

- Add the smallest validation extensions needed so the evaluator does not need to guess about malformed authored shapes.
- Add one documentation-alignment task to update [ConversationDSL.md](/mnt/c/workspace/mud/ranviermud/docs/plans/ConversationDSL.md) where needed so its wording matches the approved phase 3 execution plan before implementation drifts from planning intent.
- Add a generally usable deep-clone utility for the same narrow plain-data shapes used by the deep-freeze utility in this phase.
- Add a generally usable deep-freeze utility and matching branded read-only type for use in this phase's read-only boundaries.

Here, "deep-freeze utility" means a helper that takes supported plain authored data, returns a newly cloned deeply frozen copy, and leaves the caller's original value unchanged.

Here, "deep-clone utility" means a helper that copies only the narrow plain-data shapes supported in this phase and rejects unsupported complex values explicitly.

Here, "branded read-only type" means a JSDoc/TypeScript type marker used for static checking so certain functions can explicitly require already-frozen inputs.

- Add bundle-validation support for conversations so maintainers can surface broken or non-executable conversation definitions before runtime interaction.

Here, "bundle validation" means the existing repository validation tooling that checks bundle health without requiring a live telnet/game session.

- Keep lazy runtime lookup authoritative for actual conversation use.

Here, "lazy runtime lookup" means the runtime loads or resolves a conversation definition when it is needed for play, rather than depending on startup being the only time definitions are loaded.

- Add conversation fixtures in the test bundle that cover more than the current minimal `actorPlanner` file.
- Add tests for state resolution, visible-event filtering, transition selection, `default`, `auto`, `final`, trace output, and invalid persisted state.

## Out of Scope

- `talk`, `talk to <npc>`, or any other new command.
- Directed speech interception such as `say <event> to <npc>`.
- Numeric menu generation, numbering, or selector interception.
- Installing, replacing, or clearing engagement state.
- Lifecycle cleanup such as disconnect, room-change, despawn, or stale-menu invalidation.
- Multiplayer visibility policy.
- Executing authored effects.

In this phase, effects may be returned as data, but they must not be applied.

- Rendering authored output.

In this phase, authored speech or other output may be returned as data, but it must not be dispatched.

- Broad query-surface expansion.

If the evaluator needs condition checks, it should consume an injected read-only helper rather than expand the shared query facade beyond what is strictly required for this phase.

- Rich authored DSL support beyond the subset needed for deterministic evaluation.
- Using `docs/lore/kingDead.conversation.yml` as the first required runnable target.

That draft already depends on query and text features that are broader than this phase should own.

- Engine-wide dynamic code reload or hot module replacement.

Here, "dynamic code reload" means changing JavaScript runtime modules in a live process without restarting the MUD.

- Making startup eager load the only authoritative conversation-validation path.
- Making general repository-wide rules about where all other subsystems must use deep freeze.

This plan may introduce a generally usable utility, but it does not decide repo-wide adoption rules outside the conversation scope.

## Acceptance Criteria

- A loaded conversation definition can be evaluated for one player and one NPC without going through a command surface.
- If persisted progress exists for that player and NPC, evaluation starts from that stored state.
- If no persisted progress exists, evaluation starts from the authored `initial` state.
- If persisted progress points at a missing state, the evaluator fails explicitly with a stable error result and does not silently reset to `initial`.
- Visible events are returned in the same order they appear in the authored file after filtering out hidden or blocked events.
- For an event using `transitions:`, the first passing transition in authored order is always chosen.
- `events.default` is considered only when no exact event in the current state produces a selected transition.
- State-entry effects are collected after entering the destination state.
- `auto` routes are evaluated only after state-entry effects for the entered state are collected.
- The evaluator reports both the immediate destination state and the final settled state after any `auto` routing.
- Final states are reported clearly and do not produce visible events.
- The evaluator returns a stable trace that is detailed enough for tests and later preview/debug use.
- The evaluator itself does not mutate world state, does not write player metadata, does not change engagement state, and does not dispatch output.
- New runtime validation closes any authored-shape gaps that would otherwise force the evaluator to guess.
- Any wording in [ConversationDSL.md](/mnt/c/workspace/mud/ranviermud/docs/plans/ConversationDSL.md) that conflicts with the approved phase 3 execution contract is updated before checklist drift can carry the mismatch into implementation.
- Normalized conversation definitions used by the evaluator can be converted into branded deep-frozen copies and passed through the evaluator as read-only inputs.
- Bundle validation can surface broken conversation bindings and evaluator-readiness problems without requiring a player to discover them in play.
- Actual runtime conversation use still depends on lazy lookup through the conversation-definition service rather than on startup eager load.

## Constraints

- Preserve the repository's runtime/content boundary from [AGENTS.md](/mnt/c/workspace/mud/ranviermud/AGENTS.md):
  - runtime code stays content-agnostic
  - authored conversation content stays in bundle area data
- Keep the work inside `bundle-rantamuta`; do not change engine internals.
- Reuse the existing Phase 1 and Phase 2 foundations rather than inventing parallel state or loading paths:
  - [conversation-state.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-state.js)
  - [conversation-engagement.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-engagement.js)
  - [conversation-definition-service.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-service.js)
- Keep evaluation deterministic.

Here, "deterministic" means the same authored definition, the same stored player progress, the same read-only condition inputs, and the same event id must always produce the same result.

- Do not force this phase to own full condition lowering or full effect lowering.
- Do not mix this evaluator into `say`, `talk`, or input-event code in this phase.
- Keep command behavior unchanged.
- Do not edit or depend on command-routing surfaces in this phase:
  - [say.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/say.js)
  - [command-dispatch.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/command-dispatch.js)
  - [main.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/input-events/main.js)
- Keep deep-freeze adoption scoped to this phase's conversation boundaries.
- The utility itself should be general enough for any JavaScript object, but this plan should only decide its use for:
  - normalized conversation definitions
  - read-only evaluator inputs or views created for this phase
- The deep-freeze utility must be light-weight:
  - no external dependency
  - no subsystem-specific behavior
  - no registration or plugin mechanism
  - return a new deeply frozen clone rather than freezing the caller's original object
- For this phase, the deep-freeze utility should support only simple plain-data shapes that match normalized authored conversation data:
  - primitives
  - plain objects whose own values are supported values
  - arrays, if normalized conversation definitions for this phase still contain them
- For this phase, the deep-freeze utility should reject unsupported complex values explicitly rather than guessing:
  - circular references
  - `Map`
  - `Set`
  - `Buffer`
  - typed arrays
  - functions
  - class instances or other special runtime objects
- Do not tie conversation correctness to process startup as the only validation point.
- Any condition support used in this phase must align with the shared read-only `q.*` query surface rather than introducing a conversation-local condition API.
- There is no conversation-specific query surface outside `q.*` in this phase.
- If a needed read does not already exist in `q.*`, it must be added to the shared query facade itself rather than introduced as a conversation-only helper, and that expansion requires explicit maintainer approval because it widens a shared runtime surface.
- Prefer a design where:
  - runtime use can load definitions lazily
  - bundle validation can check those definitions early
  - future cache invalidation or shard-local loading can be added without changing evaluator semantics
- Prefer simple, explicit data shapes over clever helper layers.
- If a behavior is unclear, the evaluator should return an explicit failure rather than inventing fallback behavior.

## Implementation Surfaces

- New evaluator module, likely [conversation-runtime.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-runtime.js)
  - must remain a pure evaluator surface rather than a command, menu, or dispatch integration layer
  - resolve current state from persisted progress or authored `initial`
  - support both current-state inspection and exact-event evaluation without changing command behavior
  - compute visible events
  - select exact-event, guarded-transition, or hidden-default outcomes
  - collect returned transition effects and state-entry effects
  - follow `auto` routes with visited-state detection and a hard cap of 32 hops
  - expose destination-state, settled-state, final-state, and trace information
- Possible small validation expansion in [conversation-definition-validation.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-validation.js)
  - only where required so the evaluator does not need to guess about authored shape
- Documentation alignment update in [ConversationDSL.md](/mnt/c/workspace/mud/ranviermud/docs/plans/ConversationDSL.md)
  - should bring DSL wording into line with the approved phase 3 execution rules where the plan intentionally becomes more precise
- Existing persisted-progress helper in [conversation-state.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-state.js)
  - source of player-owned stored state
- Existing loader in [conversation-definition-service.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-service.js)
  - source of loaded definitions consumed by the evaluator
  - should remain the authoritative lazy lookup path for runtime use
- New general deep-clone helper, likely under `bundles/bundle-rantamuta/lib/` or `bundles/bundle-rantamuta/lib/helpers/`
  - must be conversation-agnostic in implementation
  - must stay narrow to the same supported plain-data shapes used by deep-freeze in this phase
- New general deep-freeze helper, likely under `bundles/bundle-rantamuta/lib/` or `bundles/bundle-rantamuta/lib/helpers/`
  - must be conversation-agnostic in implementation
  - must use the narrow deep-clone helper to produce frozen read-only copies without mutating the source
- New branded read-only typedef surface
  - used so evaluator-facing APIs can declare that they accept frozen normalized definitions rather than mutable raw objects
- Shared read-only query facade in [predicate-runtime.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js)
  - candidate home for the standardized read-only condition interface this phase should consume
  - any new query needed by conversations must be added here, not as a conversation-local side surface, and only with explicit approval
- Existing bundle validation runner in [validate-bundles.js](/mnt/c/workspace/mud/ranviermud/util/validate-bundles.js)
  - likely host for conversation validation integration
  - should surface maintainer-facing findings without changing runtime load authority
- New or expanded test fixtures under `bundles/bundle-rantamuta/areas/test/conversations/`
  - one fixture for visible-event ordering and guarded selection
  - one fixture for `default`
  - one fixture for `auto`
  - one fixture for final-state handling
- New tests, likely under `bundles/bundle-rantamuta/tests/`
  - evaluator unit tests
  - validation tests for any newly required authored-shape rules

## Validation Mapping

This section decides the validation shape before implementation begins.

Here, "test group heading" means the `describe(...)` label used to group related tests in one test file.

The file names below are intentionally recommendations, not forced names, but later implementation should stay close to them unless there is a strong reason not to.

### 1. Add one runtime-owned conversation evaluation module under `bundles/bundle-rantamuta/lib/session/`.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `bundle-rantamuta conversation runtime`
- Evidence type:
  - `unit`
- Required tests:
  - `exports one stable public evaluator surface`
  - `accepts a loaded definition, player, and npcRef`
  - `returns a structured result instead of mutating the caller inputs`
  - `does not require say, talk, or command-dispatch wiring to run`

### 2. Resolve the current conversation state for a specific player and specific NPC.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `The current conversation state for a specific player and specific NPC`
- Evidence type:
  - `unit`
- Required tests:
  - `uses persisted conversation state from player metadata when present`
  - `uses the authored initial state when persisted state is absent`
  - `keeps same-named NPC ids in different areas on different state paths`

### 3. Define one stable input shape for the evaluator.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `conversation runtime input shape`
- Evidence type:
  - `unit`
- Required tests:
  - `accepts a loaded definition, player, npcRef, and optional event id`
  - `supports inspection of the current state when no event id is provided`
  - `rejects calls that omit required runtime inputs`
  - `passes a shared-query-surface-compatible read-only condition helper through without rewriting it`
  - `treats player input as read-only for evaluation purposes`

### 4. Define one stable output shape for the evaluator.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `conversation runtime result shape`
- Evidence type:
  - `unit`
- Required tests:
  - `returns source state, destination state, settled state, visible events, and final-state flag in one stable result`
  - `returns transition effects and state-entry effects as data only`
  - `returns a trace object with stable top-level fields`

### 5. Compute visible events in the order they are written in the authored file.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Supporting fixture:
  - one authored test conversation with several events in a deliberate order
- Primary test group heading:
  - `visible events`
- Evidence type:
  - `unit`
- Required tests:
  - `preserves authored event order after filtering`
  - `excludes hidden default from visible events`
  - `excludes events whose condition does not pass`

### 6. Support exact event matching by authored event id.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `exact event matching`
- Evidence type:
  - `unit`
- Required tests:
  - `selects the authored event whose id exactly matches the input event id`
  - `does not match a different event by prefix or fuzzy similarity`
  - `treats event meaning as local to the current state`

### 7. Support the single-transition event form.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `single-transition events`
- Evidence type:
  - `unit`
- Required tests:
  - `takes the target state when an unconditional single-transition event is selected`
  - `takes the target state when a conditioned single-transition event passes`
  - `returns no selected transition when a conditioned single-transition event fails and no default applies`

### 8. Support the guarded `transitions:` form.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Supporting fixture:
  - one authored test conversation with one event that has several ordered guarded outcomes
- Primary test group heading:
  - `guarded transitions`
- Evidence type:
  - `unit`
- Required tests:
  - `uses the first passing guarded transition in authored order`
  - `does not continue to later guarded transitions after a passing match`
  - `returns no selected guarded transition when none pass and no default applies`

### 9. Support hidden `events.default` fallback.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Supporting fixture:
  - one authored test conversation with exact events plus `events.default`
- Primary test group heading:
  - `default fallback`
- Evidence type:
  - `unit`
- Required tests:
  - `uses default when no exact event id exists in the current state`
  - `uses default when an exact event exists but no transition in that event is selected`
  - `does not use default when an exact event exists and succeeds`
  - `uses conditioned default when its condition passes`
  - `returns no transition when neither an exact event nor default applies`

### 10. Support state `onEntry.effects` as returned data only.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Supporting fixture:
  - one authored test conversation whose destination state has `onEntry.effects`
- Primary test group heading:
  - `state entry effects`
- Evidence type:
  - `unit`
- Required tests:
  - `collects destination state onEntry effects after entering the destination state`
  - `does not execute returned onEntry effects`
  - `keeps transition effects and state-entry effects separately identifiable in the result or trace`

### 11. Support `auto` routing after `onEntry`.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Supporting fixture:
  - one authored test conversation with `onEntry` plus `auto`
- Primary test group heading:
  - `auto routing`
- Evidence type:
  - `unit`
- Required tests:
  - `evaluates auto routes only after collecting onEntry effects`
  - `uses the first passing auto route in authored order`
  - `takes an unconditional auto route when earlier conditioned routes fail`
  - `records the entered states and the settled state in the trace`
  - `fails explicitly when one auto chain revisits a state`
  - `fails explicitly when one auto chain exceeds the 32-hop hard cap`

### 12. Support final states.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Supporting fixture:
  - one authored test conversation that ends in `final: true`
- Primary test group heading:
  - `final states`
- Evidence type:
  - `unit`
- Required tests:
  - `marks final states clearly in the evaluator result`
  - `returns no visible events from a final state`
  - `still reports state-entry effects for a final state when authored`

### 13. Define failure behavior for persisted progress drift.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `invalid persisted state`
- Evidence type:
  - `unit`
- Required tests:
  - `fails explicitly when stored player progress points at a missing state`
  - `does not silently reset to authored initial on invalid stored state`
  - `does not mutate player metadata when invalid stored state is encountered`

### 14. Add the smallest validation extensions needed so the evaluator does not need to guess about malformed authored shapes.

Validation shape:

- Primary test file:
  - [conversation.definition.validation.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.definition.validation.test.js)
- Possible secondary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `conversation definition validation for phase 3 runtime execution`
- Evidence type:
  - `unit`
- Required tests:
  - `rejects event shapes that would force runtime guessing`
  - `rejects auto-routing shapes that would force runtime guessing`
  - `rejects authored combinations that make evaluation order unclear`
  - `keeps validation errors deterministic and code-based`
- Additional decision:
  - if a malformed shape is better caught at runtime than at load time, add one evaluator test that proves the runtime fails explicitly instead of guessing

### 15. Add conversation fixtures in the test bundle that cover more than the current minimal `actorPlanner` file.

Validation shape:

- Primary fixture location:
  - `bundles/bundle-rantamuta/areas/test/conversations/`
- Primary test file:
  - [test.actor-hooks.data.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/test.actor-hooks.data.test.js) or a new nearby fixture-coverage test
- Primary test group heading:
  - `conversation runtime test fixtures`
- Evidence type:
  - `integration/smoke`
- Required tests:
  - `includes a fixture for authored event ordering and filtering`
  - `includes a fixture for guarded transitions`
  - `includes a fixture for hidden default`
  - `includes a fixture for auto routing`
  - `includes a fixture for final-state handling`

### 16. Add a generally usable deep-clone utility for the same narrow plain-data shapes used by deep-freeze in this phase.

Validation shape:

- Primary test file:
  - one new helper test file, likely [deep.clone.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/deep.clone.test.js)
- Evidence type:
  - `unit`
- Required tests:
  - `returns a new deep clone for supported plain object input`
  - `returns new nested objects and arrays instead of sharing mutable references`
  - `does not mutate the caller's original input`
  - `rejects unsupported complex values without changing the caller's original input`
- Additional scope note:
  - this helper stays narrow to the same plain-data contract used by deep-freeze in this phase

### 17. Add a generally usable deep-freeze utility and matching branded read-only type for use in this phase's read-only boundaries.

Validation shape:

- Primary test file:
  - one new helper test file, likely [deep.freeze.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/deep.freeze.test.js)
- Possible supporting evaluator test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Primary test group heading:
  - `deep freeze utility`
- Evidence types:
  - `unit`
  - `contract/parity`
- Required tests:
  - `returns a new deeply frozen clone for supported plain object input`
  - `deep-freezes nested plain objects and arrays when arrays are part of supported input`
  - `does not freeze or otherwise mutate the caller's original input`
  - `rejects unsupported complex values without changing the caller's original input`
  - `can be used to convert normalized conversation definitions into read-only evaluator input`
  - `supports a branded read-only typedef used by evaluator-facing APIs`
  - `conversation runtime accepts branded frozen definition copies and does not mutate them`
- Additional scope note:
  - this phase should validate conversation-scoped use of the utility, not define repo-wide adoption tests for unrelated systems

### 18. Add bundle-validation support for conversations so maintainers can surface broken or non-executable conversation definitions before runtime interaction.

Validation shape:

- Primary implementation surface:
  - [validate-bundles.js](/mnt/c/workspace/mud/ranviermud/util/validate-bundles.js)
- Likely supporting runtime surface:
  - [conversation-definition-service.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-service.js)
  - the phase 3 evaluator module
- Primary test file:
  - one new validator test file, likely [validate.bundles.conversation.test.js](/mnt/c/workspace/mud/ranviermud/test/validate.bundles.conversation.test.js) or another repository-consistent nearby name
- Primary test group heading:
  - `bundle validation for conversations`
- Evidence types:
  - `integration/smoke`
  - `contract/parity`
- Required tests:
  - `reports broken conversation bindings during bundle validation`
  - `reports evaluator-readiness failures during bundle validation`
  - `uses the same conversation loading path as runtime use rather than a parallel ad hoc parser`
  - `surfaces maintainer-facing findings without changing normal runtime lookup behavior`
  - `does not require startup eager load to be the only way conversations are checked`

### 19. Add tests for state resolution, visible-event filtering, transition selection, `default`, `auto`, `final`, trace output, and invalid persisted state.

Validation shape:

- Primary test file:
  - [conversation.runtime.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js)
- Supporting integration test file:
  - one loader-to-runtime integration test file if needed, likely [conversation.runtime.integration.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.integration.test.js)
- Primary test group heading:
  - `bundle-rantamuta conversation runtime`
- Evidence types:
  - `unit`
  - `integration/smoke`
  - `contract/parity`
- Required tests:
  - all behavior-specific tests named above
  - `conversation runtime rejects or safely handles mutable raw definitions when a branded frozen definition copy is required by the chosen API shape`
  - `loaded definitions from the phase 2 service can be evaluated without a parallel loading path`
  - `bundle validation checks conversations early without replacing lazy runtime lookup`
  - `phase 3 does not change say command behavior`
  - `phase 3 does not change input-event or general command-dispatch behavior`

## Risks and Mitigations

- Risk: phase 3 quietly absorbs phase 5 by trying to fully execute conditions and effects.
  - Mitigation: keep this phase focused on evaluation only; return effects as data and only consume condition support through the shared read-only `q.*` query surface contract.
- Risk: the plan becomes more precise than [ConversationDSL.md](/mnt/c/workspace/mud/ranviermud/docs/plans/ConversationDSL.md), and later checklist authoring or implementation quietly follows the older wording instead.
  - Mitigation: carry an explicit documentation-alignment item so the DSL document is updated where needed before implementation drifts from the approved plan.
- Risk: phase 3 quietly absorbs later command-integration phases by drifting into `say`, `talk`, menu, or command-dispatch work.
  - Mitigation: keep command-routing files out of scope, require evaluator tests that run without those surfaces, and treat any command-file edit as a scope break that must be approved separately.
- Risk: authored files that passed phase 2 loading still leave the evaluator guessing.
  - Mitigation: add only the minimal extra validation rules needed to make runtime behavior explicit.
- Risk: invalid stored player progress is silently reset, hiding content drift and creating hard-to-debug behavior.
  - Mitigation: fail explicitly with a stable error code and test that path.
- Risk: `auto` routing can create loops or long chains that are hard to debug.
  - Mitigation: use visited-state detection plus a hard cap of 32 hops, and record the visited states and failure reason in the trace.
- Risk: the first runnable fixture is too small, so later integration work still uncovers basic evaluator gaps.
  - Mitigation: add a small but purpose-built authored fixture that exercises guarded transitions, hidden default, and auto-routing.
- Risk: conversation validation becomes tied to startup eager loading, making later shard-local loading or reload-friendly invalidation harder.
  - Mitigation: keep lazy runtime lookup authoritative and treat bundle validation as an early maintainer-facing check, not as the only correctness path.
- Risk: the deep-freeze helper grows into a repo-wide policy vehicle during a conversation-scoped phase.
  - Mitigation: keep the helper implementation general, but limit adoption and validation in this plan to the conversation runtime boundary only.
- Risk: the plan uses too much internal jargon.
  - Mitigation: keep plain-language section text and define unavoidable terms inline on first use.

## Open Questions / Assumptions

- Assumption: the evaluator can treat the loaded conversation definition from phase 2 as the only authored source of truth for this phase.
- Assumption: later command surfaces can consume returned evaluator data without needing the evaluator itself to know about sessions, prompts, or menus.
- Assumption: this phase will not widen the shared query facade unless explicit approval is granted for a specific new `q.*` read.
- Open question: should the evaluator expose one public entry point with optional event input, or separate entry points for:
  - "inspect current state"
  - "apply event"
  - "follow auto routes"

This plan does not require the final API naming to be decided in advance, but it does require one stable testable result shape.

- Assumption: runtime loop protection for `auto` will use both visited-state detection and a 32-hop hard cap.
- Open question: whether some `auto` loop risks should also be rejected during definition validation when they are obvious from authored data alone.

The preferred direction is both, where practical: catch obvious authored problems early, and still fail explicitly at runtime if one is encountered during evaluation.

- Open question: should conversation bundle validation live as:
  - a direct integration in `util/validate-bundles.js`
  - a bundle-owned validation hook similar to the current Virtual Door pattern
  - or a shared helper that both paths call

The preferred direction is a shared helper or hook-based integration that keeps runtime and validation behavior aligned.

- Open question: should the evaluator require branded frozen definitions at every public entry point, or should the loader/service own freezing so most callers never have to think about it?

The preferred direction is for the loader/service boundary to own clone-and-freeze conversion so evaluator callers usually receive the right shape by construction.

## Drift Checklist

Use this checklist during implementation review to keep phase 3 from drifting into later phases.

- The change keeps the evaluator a pure conversation evaluator rather than a command or menu feature.
- The change does not edit [say.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/say.js), [command-dispatch.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/command-dispatch.js), or [main.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/input-events/main.js).
- The evaluator returns data instead of applying effects, dispatching output, or writing player progress.
- The evaluator uses the existing conversation-definition service as the runtime load path rather than inventing a parallel loader.
- Any condition support is injected only through the shared `q.*` surface, and no conversation-local query helper API has been introduced.
- Any needed new query has explicit approval and extends [predicate-runtime.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js), not a side channel.
- The evaluator treats player and NPC inputs as read-only sources for evaluation rather than as mutation targets.
- The result shape is stable and testable, with trace data detailed enough to explain how the evaluator reached its answer.
- Bundle validation surfaces maintainer-facing problems early without replacing lazy runtime lookup during play.
- Any new helper introduced in this phase stays narrow and phase-appropriate instead of becoming a general policy vehicle.
- The implementation or checklist includes the planned wording-alignment update to [ConversationDSL.md](/mnt/c/workspace/mud/ranviermud/docs/plans/ConversationDSL.md) where the approved plan intentionally sharpened semantics.
- If a proposed change needs command interception, menu installation, effect execution, output rendering, or progress writes, it does not belong in phase 3 and should stop for scope review.

## Validation Strategy

This phase changes executable runtime behavior, so it requires the repository behavior-change validation from `AGENTS.md`.

### Unit

Required evidence:

- tests proving current-state resolution prefers stored player progress over authored `initial`
- tests proving absence of stored progress falls back to authored `initial`
- tests proving invalid stored state fails explicitly
- tests proving visible events preserve authored order after condition filtering
- tests proving hidden `default` is not included in visible events
- tests proving the first passing guarded transition wins in authored order
- tests proving `default` is considered only after exact event lookup fails to produce a selected transition
- tests proving `onEntry` data is collected before `auto` is evaluated
- tests proving the evaluator reports both immediate destination state and settled state after `auto`
- tests proving `auto` loop detection and the 32-hop hard cap fail explicitly and deterministically
- tests proving final states report no visible events
- tests proving trace output records the important evaluation steps in a stable shape

Pass/fail:

- Pass if the evaluator produces one stable, predictable result for the same inputs and does not mutate state.
- Fail if it depends on incidental object order, silently rewrites invalid progress, or mixes evaluation with mutation or dispatch.

### Integration / Smoke

Required evidence:

- tests proving a definition loaded through the existing conversation-definition service can be passed into the evaluator successfully
- tests proving evaluation for two same-named NPC ids in different areas stays isolated through the existing `npcRef` persistence contract
- tests proving new authored fixtures in the test bundle exercise guarded transition, hidden default, auto-routing, and final-state behavior through the same loader path used by runtime content
- tests proving normalized conversation definitions can be converted into frozen copies and then consumed by the evaluator without mutation
- tests proving bundle validation can surface conversation problems early while runtime use still relies on lazy lookup

Pass/fail:

- Pass if loaded authored content can be evaluated end to end through the existing loading and stored-progress helpers without command-surface wiring, and if bundle validation can inspect that same content early without becoming the only authority.
- Fail if the evaluator needs a parallel loading path, if validation and runtime silently diverge, or if the phase breaks the existing area-local NPC identity contract.

### Contract / Parity

Required evidence:

- tests proving this phase does not change `say`, input handling, or general command dispatch behavior
- tests proving any added validation rules are explicit and deterministic rather than warning-only guesswork inside the evaluator
- tests proving the evaluator returns data for later effect/render handling instead of applying those effects directly
- tests proving the branded read-only type is documented and used at evaluator-facing boundaries introduced in this phase
- tests proving no conversation-local query surface was introduced and any approved new condition read extends the shared `q.*` facade instead
- documentation alignment proving [ConversationDSL.md](/mnt/c/workspace/mud/ranviermud/docs/plans/ConversationDSL.md) reflects the approved phase 3 semantics where this plan intentionally made the execution contract more precise
- tests proving bundle validation findings use maintainer-facing reporting and do not leak player-facing runtime behavior into the validator path

Pass/fail:

- Pass if this phase adds only the intended evaluation core plus early maintainer-facing bundle validation support, while keeping command behavior unchanged.
- Fail if it introduces hidden command routing, direct mutation, partial effect execution, or startup-only validation authority.

### Required Repository Validation

For executable implementation of this plan:

- `npm test`
- `npm run ci:local`

## Compatibility and Records

- No `CHANGELOG.md` entry is expected for plan authoring itself.
- For implementation of this phase, a `CHANGELOG.md` entry is not expected unless the work changes a user-visible command or runtime compatibility boundary.
- A normative document update is not expected for this plan by itself.
- If implementation of this phase grows beyond internal evaluation groundwork and changes player-visible command behavior, stop and update the relevant normative or changelog records before proceeding.
