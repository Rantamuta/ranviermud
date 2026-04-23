# Conversation Engagement And Condition Integration Plan

Status: draft

## Goal

Complete the missing live-runtime conversation pieces so the current
conversation system can:

- remember the player's current live conversation engagement in memory
- evaluate authored guards in real gameplay through shared read-only query and
  evaluation infrastructure built on the predicate runtime

## Intent

The conversation runtime should stop being only a partly wired prototype.

After this work, when a player successfully uses a live conversation surface
such as `say <event> to <npc>`, the runtime should do two things it does not do
today:

- remember which conversation the player is actively engaged with right now
- honor authored guarded behavior in the live game the same way the pure
  evaluator already does in tests

In plain language, the system should know both:

- what live conversation context the player is currently in
- whether the authored rules that hide or allow conversation branches are true
  in the current game state

This plan does not add menus or menu input yet. It only makes the live
conversation runtime real enough that those later features have a correct
foundation.

For this plan, "authored guard" means a conversation-authored gating rule in
the conversation DSL. It does not mean that conversation routing becomes a
bundle predicate registry by identity. The goal is to reuse shared evaluation
infrastructure, not to collapse conversation guards into a different authored
subsystem.

## In Scope

- adopt `conversation-engagement.js` as a real live runtime surface
- define the canonical engagement record shape for the current conversation
  slice
- set, replace, and clear engagement from successful directed-speech
  conversation flow
- wire live guard evaluation into `evaluateConversationRuntime(...)` calls made
  from directed speech
- reuse the shared predicate runtime and read-only query facade for live
  conversation guard evaluation
- add focused tests covering live engagement updates and live guarded
  conversation behavior
- update conversation-facing design/readiness docs only where needed to keep
  this work coherent

## Out of Scope

- menu rendering
- numeric menu input
- stale-menu rejection UX
- `talk` command implementation
- transcript/history systems
- broad conversation DSL redesign
- changing authored content outside what narrow test fixtures require
- changing engine internals

## Acceptance Criteria

- Successful directed speech that matches a conversation route records a live
  engagement object for the chosen runtime owner for this slice.
- Final-state directed speech clears live engagement instead of leaving stale
  engagement behind.
- Engagement records at least:
  - the engaged NPC identity
  - the loaded conversation definition identity
  - the current settled conversation state
  - the currently visible authored event ids
  - a revision value suitable for later menu work
- In this slice, engagement begins only after a successful routed live
  conversation interaction. Merely being in a potentially talkable state does
  not create engagement yet.
- `visibleEventIds` recorded into engagement come from the settled state after
  auto settling and guard evaluation, exclude hidden/default internal routes,
  and preserve the runtime's deterministic authored ordering.
- Live directed speech provides `conditionEvaluator` and `q` to
  `evaluateConversationRuntime(...)`.
- Authored guarded behavior that already works in pure runtime tests also works
  through the live directed-speech path.
- Live conversation guard evaluation reuses shared read-only query and
  evaluation infrastructure based on the predicate runtime rather than a
  conversation-only evaluator.
- Ordinary guard evaluation returning `false` remains a normal runtime outcome,
  not a maintainer-facing failure.
- Authored guard contract violations and runtime integration failures are
  surfaced distinctly from ordinary false-guard outcomes.
- If live guard evaluation cannot be wired correctly at runtime, the system
  fails through the existing maintainer-facing directed-speech failure path
  rather than silently treating guards as always true or always false.
- Persisted conversation progress remains separate from transient live
  engagement.
- The change remains reversible and does not introduce menu rendering or
  numeric-input behavior early.

## Constraints

- Preserve the runtime/content boundary from `AGENTS.md`.
  - `lib/**` and `commands/**` remain content-agnostic runtime layers.
  - no area-specific IDs or content logic may leak into conversation runtime
    code.
- Keep `conversation-runtime.js` pure.
  - it may accept `conditionEvaluator` and `q`
  - it should not load predicate runtime services or own engagement storage
- Do not invent a conversation-only guard system.
  - conversation guards remain conversation-authored guard constructs
  - shared predicate runtime and query infrastructure are reused as the live
    evaluation mechanism
  - conversation guards are not treated as bundle predicate registry entries by
    identity
- Do not collapse transient engagement into persisted player conversation
  progress
- `conversation-engagement.js` remains the storage surface for transient
  engagement.
  - if an adapter is introduced, it is a narrow integration helper over that
    storage surface rather than a second competing engagement store
- Do not begin menu rendering or numeric selector interception in this slice

## Implementation Surfaces

Primary runtime surfaces likely to change:

- `bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js`
  - supply `conditionEvaluator` and `q`
  - set or clear transient engagement after successful evaluation
- `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-engagement.js`
  - reused as the storage surface
  - may gain tiny convenience helpers if needed
- `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js`
  - should ideally remain behaviorally pure
  - touch only if integration reveals a missing stable output detail
- `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`
  - reused as shared evaluation infrastructure, not replaced
  - may need a narrow integration seam if no suitable live-facing entrypoint is
    currently available for conversation-authored guards

Possible new runtime surfaces:

- `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-condition-adapter.js`
  - builds `conditionEvaluator` and `q` from live scope
- `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-engagement-adapter.js`
  - optional narrow helper
  - builds canonical engagement records and applies set/clear policy over
    `conversation-engagement.js`

Primary test surfaces likely to change:

- `bundles/bundle-rantamuta/tests/conversation.directed-speech.test.js`
- `bundles/bundle-rantamuta/tests/conversation.runtime.test.js`
- `bundles/bundle-rantamuta/tests/conversation.engagement.test.js`
- `bundles/bundle-rantamuta/tests/say.command.test.js`

Documentation surfaces likely to change later in the same task set:

- `docs/plans/ConversationRuntimeReadiness.md`
- `docs/drafts/ConversationEngagementAndConditionIntegrationDesign.md`

## Risks and Mitigations

### Risk: engagement owner choice leaks across the wrong lifetime

If engagement is keyed to the wrong owner object, it may persist too long or
not long enough.

Mitigation:

- prefer session-scoped ownership when available
- keep the engagement record narrow
- cover owner lifetime behavior in focused tests

### Risk: conversation code grows a second guard evaluator

If directed speech starts evaluating guards ad hoc, conversation behavior will
drift from the shared predicate runtime.

Mitigation:

- require the shared predicate runtime and `q` facade
- forbid a conversation-only guard engine in this slice

### Risk: menu concerns leak into this slice

Because engagement is menu-ready state, implementation may try to partially add
menu behavior too early.

Mitigation:

- keep acceptance criteria focused on engagement storage and guard wiring only
- explicitly defer menu rendering and numeric input

### Risk: live failure behavior becomes permissive

If guard wiring fails and the runtime silently treats guards as passing or
failing, conversation content will drift in difficult-to-debug ways.

Mitigation:

- require explicit maintainer-facing failure through the existing directed
  speech path
- add tests for failure posture when guard wiring is missing or broken

## Open Questions / Assumptions

- Preferred assumption: engagement should be keyed by session-owned runtime
  owner, not by persisted player object.
- If the directed-speech integration seam cannot supply a session-owned owner,
  checklist authoring must explicitly lock the alternative owner choice before
  implementation begins.
- Assumption: `say <event> to <npc>` remains the first live conversation
  surface used to prove engagement and guard integration.
- Open question: whether a small reusable adapter module should be introduced
  immediately, or whether the first implementation should wire directly in
  `directed-speech.js` and extract only if the seam proves stable.
- Open question: whether the shared predicate runtime already exposes the exact
  live-facing entrypoint needed for conversation-authored guards, or whether a
  narrow adapter is needed to normalize the call contract.

## Validation Strategy

This is a behavior-changing plan, so implementation from it must satisfy the
repo validation rules in `AGENTS.md`.

### Unit

Required evidence:

- pure evaluator tests remain green for guarded visibility, guarded
  transitions, guarded default, and guarded auto behavior
- engagement helper/adapter tests proving set, replace, read, and clear policy
- focused integration tests proving that the live directed-speech path supplies
  the expected guard-evaluation inputs to the pure evaluator

Pass condition:

- tests show the live conversation path now honors guards and records
  engagement deterministically without changing the pure evaluator contract

### Integration/Smoke

Required evidence:

- directed-speech tests proving a successful live conversation route both:
  - persists settled conversation progress
  - updates transient engagement
- directed-speech tests proving:
  - ordinary false-guard outcomes do not produce maintainer-facing failures
  - malformed guard/integration failures do produce the expected
    maintainer-facing failure path
- `say` command tests proving addressed speech still falls through correctly
  when no conversation route matches

Pass condition:

- live command surfaces behave correctly both when conversation matches and when
  normal speech should remain in control

### Contract/Parity

Required evidence:

- tests proving live guarded directed speech produces the same evaluator
  decisions the pure runtime already supports
- tests proving live conversation guard evaluation uses the shared
  predicate-runtime-backed query/evaluation model instead of a divergent local
  rule set

Pass condition:

- guarded behavior is consistent between pure runtime expectations and live
  runtime behavior

### Repo Validation

Required evidence:

- `npm test`
- `npm run ci:local`

Pass condition:

- both pass after implementation, with no unapproved validation skips
