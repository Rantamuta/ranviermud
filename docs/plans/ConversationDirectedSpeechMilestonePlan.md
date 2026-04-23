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
- 5. [ ] Build the shared read-only `q` facade from live command scope:
  actor/player, NPC, room, area, and world/state.
- 6. [ ] Pass `conditionEvaluator` and `q` into
  `evaluateConversationRuntime(...)`.
- 7. [ ] Ensure ordinary false guard results are normal conversation outcomes, not
  maintainer-facing failures.
- 8. [ ] Ensure malformed or unsupported guard integration failures are logged
  through the existing maintainer-facing directed-speech failure path.
- 9. [ ] Verify exact guarded event selection works through
  `say <action> to <npc>`.
- 10. [ ] Verify failed guarded exact events can fall through to authored
  `events.default` when present.
- 11. [ ] Verify guarded `events.default` works through live directed speech.
- 12. [ ] Verify guarded `auto` settling works through live directed speech.
- 14. [ ] Verify no matching conversation route still falls back to ordinary
  addressed `say`.
- 15. [ ] Verify successful conversation speech commits authored effects before
  writing the settled persisted conversation state.
- 16. [ ] Verify failed lowering/evaluation does not mutate persisted conversation
  state.
- 17. [ ] Do not add engagement records, menu rendering, numeric input
  interception, or `talk`.
- 18. [ ] Update active planning docs to describe the remaining milestone as
  directed speech plus live guard wiring.
- 19. [ ] Run `npm test`.
- 20. [ ] Run `npm run ci:local`.

## Notes For Expansion

This checklist is intentionally minimal. Future planning may split or
reorder items, add implementation notes, or attach file-level test targets.

Do not expand this milestone by adding engagement, menu selection, or `talk`
unless maintainers explicitly reopen that scope.
