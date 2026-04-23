# Conversation Directed Speech Milestone Plan

## Status

- Status: planning
- Scope: complete the intermediate conversation milestone for directed speech
- Source design: `docs/plans/ConversationDirectedSpeechMilestoneDesign.md`

## Goal

Allow authored conversations to advance during live gameplay when a player uses:

```text
say <action> to <npc>
```

The milestone is complete when directed speech can select guarded conversation
routes, execute existing authored instructions through the normal command
pipeline, and persist the settled conversation state without adding engagement,
menus, numeric selectors, or `talk`.

## Intent

When a player addresses an NPC with a spoken action, the game should first ask
whether that NPC has an authored conversation route for that action. If a valid
route exists and its read-only condition passes, the conversation should advance
and persist progress for that player and NPC. If no valid route exists, the
command should behave like ordinary addressed speech.

Conditions are allowed to read game state through the shared read-only `q`
query surface. Conditions are not render predicates, must not call area
predicate-registry scripts, and must not silently turn malformed authoring into
ordinary "not available right now" outcomes.

Conversation engagement is deliberately not part of this milestone. The
addressed NPC plus the player's persisted conversation state for that NPC are
sufficient conversation context for directed speech.

## In Scope

- Live directed-speech conversation evaluation for `say <action> to <npc>`.
- Live guard/condition wiring for exact events, `events.default`, and `auto`
  settling.
- Shared read-only `q` facade construction from live command scope.
- Persisted per-player/per-NPC conversation progress.
- Existing authored effects and render instructions already supported by the
  authored-instructions runtime.
- Focused verification that the live path matches the pure conversation
  evaluator's guarded behavior.
- Engagement cleanup for live conversation runtime code, engagement-only tests,
  and active documentation posture.
- Documentation alignment so active conversation plans describe the milestone
  as directed speech plus live guard wiring.

## Out of Scope

- Conversation engagement records or engagement lifecycle.
- Menu rendering.
- Numeric selector input.
- Stale-menu handling.
- Intransitive `talk`.
- Transcript or conversation history systems.
- Broad conversation DSL redesign.
- New render-predicate authority for conversation progress.
- Conversation-specific query side channels outside the shared `q` facade.
- Engine-internal changes under `Rantamuta/core`.

## Constraints

- Preserve the runtime/content boundary: `commands/**` and `lib/**` must remain
  content-agnostic, and runtime layers must not hardcode area, room, item,
  puzzle, or NPC content IDs.
- Keep `commands/say.js` narrow. It should continue to route the `TEXT to
  LIVING` form through `tryDirectedConversation(...)` and otherwise fall back
  to ordinary addressed speech.
- Keep `tryDirectedConversation(...)` as the conversation-owned live entrypoint
  for addressed speech.
- Do not use `createPredicateRuntime().evaluate(...)` or area
  predicate-registry scripts for conversation progression.
- Treat a well-formed condition that evaluates to `false` as normal authored
  conversation flow, not as a maintainer-facing failure.
- Treat malformed condition shape, unsupported condition operator, missing
  required `q` method, or condition-evaluator exceptions as integration
  failures.
- Preserve existing predicate-runtime diagnostics unless an explicit
  compatibility decision authorizes changing them.
- If implementation uncovers a needed condition read that does not exist on
  `q`, stop for maintainer approval before expanding the shared query facade.

## Implementation Surfaces

- `bundles/bundle-rantamuta/commands/say.js`
  - Existing route source for `TEXT to LIVING`.
  - Expected to remain a narrow caller of `tryDirectedConversation(...)`.
- `bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js`
  - Live directed-speech orchestration.
  - Expected to build/pass `conditionEvaluator` and `q` into
    `evaluateConversationRuntime(...)`.
  - Expected to keep maintainer-facing failures on the existing
    `CONVERSATION_DIRECTED_SPEECH <code>: <message>` path.
- `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js`
  - Pure conversation evaluator.
  - Already accepts optional `conditionEvaluator` and `q`.
  - Expected to continue converting condition-evaluator throws into
    `CONVERSATION_RUNTIME_CONDITION_EVALUATION_FAILED`.
- `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-state.js`
  - Source of the structural persisted conversation-state write.
- `bundles/bundle-rantamuta/lib/runtime/authored-instructions/**`
  - Existing lowering path for authored effects and render instructions.
- `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js`
  - Current owner of `createQueryFacade(...)`.
  - Expected to stop owning the shared `q` facade after extraction.
- `bundles/bundle-rantamuta/lib/helpers/query-facade.js`
  - Expected new shared home for `createQueryFacade(...)`.
  - Expected to be imported by `predicate-runtime.js` and the directed-speech
    conversation path.
- `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-engagement.js`
  - Engagement harness targeted for cleanup if no live dependency remains.
- `bundles/bundle-rantamuta/tests/**`
  - Existing and new focused coverage for query-facade extraction, directed
    speech, guarded condition behavior, fallback behavior, transactional
    ordering, and engagement cleanup.
- Active docs under `docs/plans/Conversation*.md` and relevant superseded drafts
  - Expected to describe this milestone as directed speech plus live guard
    wiring, or clearly mark engagement discussions as superseded/archived.

## Condition Semantics

For this milestone, condition syntax remains the existing narrow declarative
query-object model described by the conversation DSL, such as:

```yaml
condition:
  actorQuestActive: "test:predicateQuestActive"
```

The live condition adapter should mirror supported condition keys to same-named
methods on the shared `q` facade where practical. A supported query returning a
non-true result means the authored route is unavailable right now. Unsupported
or malformed condition data is an integration failure, not a false guard.

For this milestone, the adapter should support only the shared `q` facade
methods needed by the milestone fixtures, using same-named condition keys. Do
not invent a separate condition-key list. If implementation needs a `q` read
that is not already available, stop for maintainer approval before expanding
the shared facade.

This milestone does not introduce arbitrary script conditions, expression
parsing, predicate-registry indirection, or a separate conversation-local query
API.

## Acceptance Criteria

- `say <action> to <npc>` can select an exact guarded conversation event when
  the guard passes.
- A failed guarded exact event can fall through to authored `events.default`
  when a usable default route exists.
- Guarded `events.default` works through live directed speech.
- Guarded `auto` settling works through live directed speech after a selected
  event lands in an intermediate state.
- A well-formed false guard is a normal conversation outcome: it does not emit
  maintainer-facing failure logs and does not mutate persisted conversation
  state by itself.
- Malformed or unsupported guard data is surfaced through the existing
  maintainer-facing directed-speech failure path and does not produce a
  conversation-state write.
- If no matching conversation route is available, addressed speech falls back
  to ordinary `say` behavior.
- Successful conversation speech commits authored effects before the structural
  persisted conversation-state write to the settled state.
- Failed condition lowering, condition evaluation, or authored-instruction
  lowering does not mutate persisted conversation state.
- The shared `q` facade is reused by conversation conditions and render
  predicates without routing conversation progress through predicate-registry
  evaluation.
- The live milestone path does not introduce or depend on engagement records,
  menu rendering, numeric input interception, or `talk`.
- Remaining engagement/menu/numeric-input/`talk` mentions in active docs,
  tests, or fixtures are surfaced and classified as removed, superseded,
  archived, explicitly out of scope, or unrelated false positives.
- Active planning docs describe the remaining milestone as directed speech plus
  live guard wiring.

## Validation Strategy

This plan changes runtime behavior and therefore requires behavior-changing
validation under `AGENTS.md`.

Required evidence:

- Unit coverage for the shared `q` facade extraction so predicate-runtime use
  keeps the same query behavior after `createQueryFacade(...)` is lifted.
- Unit coverage for the condition adapter's distinction between passing,
  ordinary false, malformed, unsupported, and missing-`q` cases.
- Integration or smoke coverage through the live directed-speech path for exact
  guarded event selection, guarded default fallback, guarded default handling,
  guarded auto-settling, ordinary addressed-say fallback, and
  maintainer-facing integration failures.
- Contract or parity coverage that render predicate behavior still uses the
  shared `q` facade without changing predicate-registry semantics.
- Transactional coverage that successful authored effects are ordered before
  conversation-state persistence and failed lowering/evaluation leaves persisted
  conversation state unchanged.
- Audit coverage that engagement/menu/numeric-input/`talk` hooks are not part
  of the live milestone path and that remaining textual mentions are classified.

Required commands before completion:

```sh
npm test
npm run ci:local
```

If either validation command fails, stop rather than silently expanding scope.
Gather the failing command, relevant output, suspected failure area, and any
obvious next diagnostic step. Ask maintainers for instructions before
implementing fixes that are not already within this approved milestone scope.

## Compatibility And Records

This milestone is user-visible because it changes live gameplay behavior for
addressed `say` when the addressed NPC has a valid conversation route.

Affected compatibility boundary:

- Reference-bundle command behavior for `say TEXT to LIVING`.

Unaffected compatibility boundaries:

- CLI flags, config keys, config resolution, boot sequence, bundle discovery,
  tick scheduling, and default directory layout.
- Engine internals under `Rantamuta/core`.

Required records:

- Update `CHANGELOG.md` when the behavior is implemented, because live gameplay
  command behavior changes.
- No new normative conversation contract is required by this plan unless
  implementation changes an existing binding contract in `docs/normative/**`.
  The existing predicate/render boundary remains governed by
  `docs/normative/PredicateStateRendering.md`.

## Risks And Mitigations

- Risk: malformed conditions are accidentally treated as ordinary false guards.
  - Mitigation: implement and test the adapter error boundary before or with
    ordinary false-guard handling.
- Risk: conversation conditions reuse predicate-registry evaluation because it
  already receives `q`.
  - Mitigation: extract the `q` facade into `lib/helpers/query-facade.js` and
    import that facade directly; do not call `createPredicateRuntime()`.
- Risk: query-facade extraction changes predicate diagnostics.
  - Mitigation: preserve current predicate-runtime warning text during the
    mechanical extraction unless a compatibility decision authorizes a wording
    change.
- Risk: engagement cleanup removes useful historical context.
  - Mitigation: do not require zero textual mentions; classify remaining
    mentions as superseded, archived, explicitly out of scope, or false
    positives.
- Risk: docs alignment turns into new feature design.
  - Mitigation: keep docs alignment limited to the directed-speech milestone
    and supersession posture; defer menus, numeric selectors, stale-menu
    handling, and `talk`.

## Open Questions And Deferments

- The exact condition adapter file name is deferred to checklist authoring, but
  ownership must remain in the conversation/runtime layer and must call the
  shared `q` facade.
- Richer condition syntax is deferred. This milestone supports only the narrow
  declarative query-object model already described by the conversation DSL.
- Menu rendering, numeric selectors, stale-menu handling, intransitive `talk`,
  and transcript/history behavior are explicitly deferred to future plans.

## Design Source Coverage

This section guards against transcription loss from the source design.

- Design item 1 is represented by `Goal`, `Intent`, `In Scope`, and `Out of
  Scope`.
- Design item 2 is represented by `In Scope`, `Out of Scope`, `Implementation
  Surfaces`, `Acceptance Criteria`, and `Risks And Mitigations`.
- Design item 3 is represented by `Constraints` and `Implementation Surfaces`
  for `commands/say.js` and `directed-speech.js`.
- Design items 4, 7, and 8 are represented by `Condition Semantics`,
  `Constraints`, `Acceptance Criteria`, `Validation Strategy`, and
  `Risks And Mitigations`.
- Design item 5 is represented by `Implementation Surfaces`, `Condition
  Semantics`, `Acceptance Criteria`, and `Risks And Mitigations`.
- Design item 6 is represented by `Implementation Surfaces` for
  `directed-speech.js` and `conversation-runtime.js`.
- Design items 9 through 15 are represented by `Acceptance Criteria` and
  `Validation Strategy`.
- Design item 16 is represented by `In Scope`, `Out of Scope`, `Acceptance
  Criteria`, `Validation Strategy`, and `Risks And Mitigations`.
- Design item 17 is represented by `In Scope`, `Acceptance Criteria`, and
  `Implementation Surfaces` for active conversation docs.
- Design items 18 and 19 are represented by `Validation Strategy`.
