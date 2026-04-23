# Conversation Directed Speech Milestone Plan

Status: draft

## Purpose

This document captures the minimal remaining work for the intermediate
conversation milestone:

```text
say <action> to <npc>
```

At this milestone, authored conversations should be able to advance through
directed speech in live gameplay.

This is a planning checklist, not a normative checklist.

## Scope

In scope:

- live directed-speech conversation evaluation
- live guard/condition wiring
- persisted per-player/per-NPC conversation progress
- authored effects and render instructions already supported by the current
  runtime
- focused tests proving the live path matches the pure evaluator's guarded
  behavior

Out of scope:

- conversation engagement
- menu rendering
- numeric selector input
- stale-menu handling
- `talk`
- transcript/history systems
- broad DSL redesign

## Design Stance

Conversation engagement is not part of this milestone.

The runtime does not need a separate engagement record to advance a
conversation through addressed speech. The addressed NPC and the player's
persisted conversation state for that NPC are sufficient to determine the
current conversation state.

Menu behavior, if added later, should not retroactively turn engagement into
core conversation state. It should be planned as its own render/input concern.

## Checklist

- 1. [ ] Confirm current milestone scope is directed speech only:
  `say <action> to <npc>`.
- 2. [ ] Complete engagement cleanup:
  - remove `conversation-engagement.js`
  - remove engagement-only tests
  - ensure remaining conversation docs either avoid engagement entirely, carry
    explicit supersession notes, or are archived
  - confirm no live conversation runtime code depends on engagement
- 3. [ ] Use the existing live directed-speech evaluation seam in
  `directed-speech.js`.
  - Finding: `commands/say.js` routes the `TEXT to LIVING` form through
    `tryDirectedConversation(...)`.
  - Finding: `tryDirectedConversation(...)` is the conversation-owned live
    entrypoint for addressed speech.
  - Finding: the exact evaluator call site is
    `bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js`,
    where `tryDirectedConversation(...)` currently calls
    `evaluateConversationRuntime({ definition, player, npcRef, eventId })`.
  - Implication: later condition work should add `conditionEvaluator` and `q`
    at that evaluator call site, without widening `say.js`.
- 4. [ ] Add a narrow live condition adapter for conversations.
  - Recommended interpretation: add a conversation-owned condition evaluator
    that supports a deliberately small declarative condition subset by calling
    the shared read-only `q.*` query facade.
  - The adapter should return `true` only for exact true outcomes.
  - Ordinary unmet conditions should return `false` as normal conversation
    outcomes.
  - Malformed or unsupported condition shapes should surface as
    maintainer-facing integration failures rather than silently becoming
    progression decisions.
  - The adapter must not call area predicate-registry scripts or use render
    predicate evaluation as the authority for conversation progression.
- 5. [ ] Build the shared read-only `q` facade from live command scope:
  actor/player, NPC, room, area, and world/state.
  - Recommended interpretation: lift the existing `createQueryFacade(...)`
    implementation out of `predicate-runtime.js` into
    `bundles/bundle-rantamuta/lib/helpers/query-facade.js`.
  - `predicate-runtime.js` should import the shared facade rather than remain
    the owner of `q`.
  - Conversation runtime should use the shared facade directly from live
    command scope; it must not call `createPredicateRuntime().evaluate(...)`
    or route conversation progress through area predicate-registry scripts.
  - Do not place the facade under `lib/runtime/conversation/`; `q` is shared
    read infrastructure, not conversation-specific machinery.
  - Caveat: the current query diagnostics use predicate-specific wording such
    as `Predicate query q...`. A mechanical extraction may leave those messages
    intact initially. If the wording is generalized, preserve existing
    predicate-runtime diagnostics unless an explicit compatibility decision says
    otherwise.
- 6. [ ] Pass `conditionEvaluator` and `q` into
  `evaluateConversationRuntime(...)`.
- 7. [ ] Ensure ordinary false guard results are normal conversation outcomes, not
  maintainer-facing failures.
  - Plain-language interpretation: a guard evaluating to `false` means the
    authored transition is not available right now; it does not mean the
    conversation system is broken.
  - A false guard should not emit maintainer-facing failure logs, should not
    mutate persisted conversation state by itself, and may allow the runtime to
    try another authored route such as `events.default`.
  - If no valid conversation route remains, directed speech may fall back to
    ordinary addressed `say`.
  - Contrast with malformed or unsupported guard data, which is likely a
    content/runtime integration problem and belongs under item 8.
- 8. [ ] Ensure malformed or unsupported guard integration failures are logged
  through the existing maintainer-facing directed-speech failure path.
  - Enforcement rule: the live condition adapter must not treat malformed or
    unsupported guard data as an ordinary `false` guard result.
  - Well-formed guard with unmet condition should return `false`.
  - Well-formed guard with met condition should return `true`.
  - Malformed guard shape, unsupported condition operator, missing required
    `q` method, or condition-evaluator exception should become an integration
    failure.
  - The pure conversation runtime already converts condition-evaluator throws
    into `ok: false` with
    `CONVERSATION_RUNTIME_CONDITION_EVALUATION_FAILED`.
  - The live directed-speech seam should then log that runtime failure through
    the existing `CONVERSATION_DIRECTED_SPEECH <code>: <message>` path and
    return `null` so player-facing speech can fall back normally.
  - Proposed verification: create a test conversation with malformed or
    unsupported condition data and invoke `say <action> to <npc>` through the
    live directed-speech path.
  - Assert `state.Logger.error` receives a message containing
    `CONVERSATION_DIRECTED_SPEECH` and
    `CONVERSATION_RUNTIME_CONDITION_EVALUATION_FAILED`.
  - Assert no conversation-state write operation is produced.
  - Assert player-facing behavior remains ordinary addressed speech fallback
    rather than a raw maintainer error.
- 9. [ ] Verify exact guarded event selection works through
  `say <action> to <npc>`.
  - Proposed verification: create or reuse a test conversation with an exact
    event id such as `unlock`, guarded by a condition that reads through `q`
    such as `actorHasItem('test:brassKey')`.
  - Invoke the live directed-speech seam with text equivalent to
    `say unlock to <npc>` while the player satisfies the guard.
  - Assert the result is a conversation success, the selected route is the exact
    guarded event rather than `events.default`, and the persisted conversation
    state advances to that event's target.
- 10. [ ] Verify failed guarded exact events can fall through to authored
  `events.default` when present.
  - Proposed verification: use a definition with both an exact event matching
    the spoken action and an authored `events.default`.
  - Give the exact event a valid guard that evaluates to `false`, and give the
    default route either no guard or a guard that evaluates to `true`.
  - Invoke `say <exact-action> to <npc>` and assert the exact event is skipped
    as unavailable, the default route is selected, and no
    maintainer-facing failure is emitted for the false exact guard.
- 11. [ ] Verify guarded `events.default` works through live directed speech.
  - Proposed verification: use a definition where the spoken action does not
    match any exact event, but `events.default` exists and has a guard.
  - Run one case where the default guard evaluates to `true` and assert the
    default transition succeeds.
  - Run one case where the default guard evaluates to `false` and assert the
    conversation route is unavailable without reporting a maintainer-facing
    integration failure.
- 12. [ ] Verify guarded `auto` settling works through live directed speech.
  - Proposed verification: use a definition where the directed-speech event
    lands in an intermediate state with one or more `auto` transitions.
  - Guard an `auto` transition with a `q`-backed condition and invoke
    `say <action> to <npc>` through the live seam.
  - Assert that passing guards allow auto-settling to continue to the expected
    settled state, while false guards stop or choose the authored fallback
    according to the conversation runtime rules.
- 13. [ ] Verify no matching conversation route still falls back to ordinary
  addressed `say`.
  - Proposed verification: use an NPC with a conversation definition but no
    exact matching event and no usable `events.default` for the spoken action.
  - Invoke `say <unmatched-action> to <npc>` through the live command path.
  - Assert the conversation layer declines to handle the input and the ordinary
    addressed `say` behavior still occurs.
- 14. [ ] Verify successful conversation speech commits authored effects before
  writing the settled persisted conversation state.
  - Proposed verification: use a successful directed-speech transition with an
    authored effect/instruction and a target conversation state.
  - Arrange the effect so its observable result can be asserted independently
    of conversation state, such as metadata or inventory change.
  - Assert the effect is committed and the persisted conversation state is then
    written to the settled target state, preserving transactional ordering.
- 15. [ ] Verify failed lowering/evaluation does not mutate persisted conversation
  state.
  - Proposed verification: start from a known persisted conversation state and
    invoke a directed-speech route whose condition lowering or evaluation fails
    as an integration error.
  - Assert the maintainer-facing failure path is used and the persisted
    conversation state remains exactly unchanged.
  - Include at least one failure that happens before authored effects are
    committed, so rollback expectations are explicit for the milestone.
- 16. [ ] Do not add engagement records, menu rendering, numeric input
  interception, or `talk`.
- 17. [ ] Update active planning docs to describe the remaining milestone as
  directed speech plus live guard wiring.
- 18. [ ] Run `npm test`.
- 19. [ ] Run `npm run ci:local`.

## Notes For Expansion

This checklist is intentionally minimal. Future planning may split or
reorder items, add implementation notes, or attach file-level test targets.

Do not expand this milestone by adding engagement, menu selection, or `talk`
unless maintainers explicitly reopen that scope.
