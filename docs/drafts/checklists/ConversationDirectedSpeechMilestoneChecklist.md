# Conversation Directed Speech Milestone Checklist

## Status

- Status: active
- Scope: implementation checklist for the directed-speech conversation milestone
- Source plan: `docs/plans/ConversationDirectedSpeechMilestonePlan.md`
- Source design: `docs/plans/ConversationDirectedSpeechMilestoneDesign.md`

## Locked Scope

In Scope:

- Live directed-speech conversation evaluation for `say <action> to <npc>`.
- Live guard/condition wiring for exact events, `events.default`, and `auto`
  settling.
- Shared read-only `q` facade construction from live command scope.
- Persisted per-player/per-NPC conversation progress.
- Existing authored effects and render instructions already supported by the
  authored-instructions runtime.
- Engagement cleanup for live runtime code, engagement-only tests, and active
  documentation posture.
- Documentation alignment for directed speech plus live guard wiring.

Out of Scope:

- Conversation engagement records or engagement lifecycle.
- Menu rendering, numeric selector input, stale-menu handling, and intransitive
  `talk`.
- Transcript/history systems and broad conversation DSL redesign.
- Render-predicate authority for conversation progress.
- Conversation-specific query side channels outside the shared `q` facade.
- Engine-internal changes under `Rantamuta/core`.

Acceptance Criteria:

- `say <action> to <npc>` selects exact guarded conversation events when guards
  pass.
- Guarded exact events, `events.default`, and `auto` settling work through live
  directed speech.
- False well-formed guards are normal conversation outcomes, while malformed or
  unsupported guards surface as maintainer-facing failures.
- No-route conversations fall back to ordinary addressed `say`.
- Successful authored effects are ordered before the structural conversation
  state write, and failed lowering/evaluation does not mutate conversation
  state.
- Conversation conditions and render predicates share `q` without routing
  conversation progress through predicate-registry evaluation.
- The live milestone path does not introduce or depend on engagement, menus,
  numeric selectors, or `talk`.

## Order Conformance

Checklist items are ordered to follow the numbered checklist in
`ConversationDirectedSpeechMilestoneDesign.md`. Each item includes a `Design
trace` entry naming the source design item. Where implementation dependencies
cross item boundaries, the dependency is stated explicitly without reordering
the design-derived sequence.

## Checklist

- [x] `C01` [dispatch] Keep `bundles/bundle-rantamuta/commands/say.js` limited to the existing `TEXT to LIVING` handoff through `tryDirectedConversation(...)`, with ordinary addressed-say fallback unchanged.
  - Trace:
    - "`say <action> to <npc>`" (`Goal`)
    - "Keep `commands/say.js` narrow. It should continue to route the `TEXT to LIVING` form through `tryDirectedConversation(...)` and otherwise fall back to ordinary addressed speech." (`Constraints`)
    - Design trace: item 1, "Confirm current milestone scope is directed speech only."
  - Validation handoff: `S1`, `integration/smoke, contract/parity`

- [x] `C02` [engagement] Remove `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-engagement.js` only after confirming no live conversation runtime dependency remains.
  - Trace:
    - "Conversation engagement is deliberately not part of this milestone." (`Intent`)
    - "Engagement cleanup for live conversation runtime code, engagement-only tests, and active documentation posture." (`In Scope`)
    - Design trace: item 2, "remove `conversation-engagement.js`" and "confirm no live conversation runtime code depends on engagement."
  - Validation handoff: `S2`, `contract/parity`

- [x] `C03` [engagement] Remove engagement-only tests or fixtures that no longer describe active conversation behavior.
  - Trace:
    - "Engagement cleanup for live conversation runtime code, engagement-only tests, and active documentation posture." (`In Scope`)
    - "The live milestone path does not introduce or depend on engagement records, menu rendering, numeric input interception, or `talk`." (`Acceptance Criteria`)
    - Design trace: item 2, "remove engagement-only tests."
  - Validation handoff: `S2`, `contract/parity`

- [x] `C04` [audit] Classify remaining engagement/menu/numeric-input/`talk` conversation mentions in active runtime code, fixtures, tests, and active docs as removed, superseded, archived, explicitly out of scope, or unrelated false positives.
  - Trace:
    - "Remaining engagement/menu/numeric-input/`talk` mentions in active docs, tests, or fixtures are surfaced and classified as removed, superseded, archived, explicitly out of scope, or unrelated false positives." (`Acceptance Criteria`)
    - "Do not require zero textual mentions; classify remaining mentions as superseded, archived, explicitly out of scope, or false positives." (`Risks And Mitigations`)
    - Design trace: item 2, "ensure remaining conversation docs either avoid engagement entirely, carry explicit supersession notes, or are archived."
  - Implementation audit:
    - `bundles/bundle-rantamuta/lib/**`, `commands/**`, and `areas/**`: no
      live conversation engagement dependency remains.
    - `bundles/bundle-rantamuta/tests/**`: engagement-only helper tests were
      removed; the remaining `talk` mention in `conversation.runtime.test.js`
      documents pure-evaluator independence from command wiring.
    - Current milestone plan/design/checklist mentions are intentional
      out-of-scope and verification language.
    - `ConversationEngagementAndConditionIntegrationPlan.md` and
      `ConversationEngagementAndConditionIntegrationDesign.md` carry
      supersession notes and are classified as superseded engagement context.
    - `ConversationSystemDesign.md`, `ConversationRuntimeReadiness.md`, and
      older directed-speech drafts still contain later-phase menu, numeric
      selector, engagement, or `talk` discussion; those are classified as
      later-phase/out-of-scope for this milestone and remain candidates for the
      active-doc alignment item.
    - Non-conversation uses of "numeric", such as `time-to-tick.js`, are
      unrelated false positives.
  - Validation handoff: `S2`, `contract/parity`

- [x] `C05` [speech] Keep `tryDirectedConversation(...)` in `bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js` as the only live conversation-owned entrypoint for addressed speech.
  - Trace:
    - "Keep `tryDirectedConversation(...)` as the conversation-owned live entrypoint for addressed speech." (`Constraints`)
    - "Expected to build/pass `conditionEvaluator` and `q` into `evaluateConversationRuntime(...)`." (`Implementation Surfaces`)
    - Design trace: item 3, "`tryDirectedConversation(...)` is the conversation-owned live entrypoint for addressed speech."
  - Validation handoff: `S3`, `integration/smoke, contract/parity`

- [x] `C06` [conditions] Add a conversation-owned live condition adapter in the conversation runtime layer that accepts the existing narrow declarative query-object condition shape.
  - Trace:
    - "For this milestone, condition syntax remains the existing narrow declarative query-object model described by the conversation DSL" (`Condition Semantics`)
    - "The exact condition adapter file name is deferred to checklist authoring, but ownership must remain in the conversation/runtime layer and must call the shared `q` facade." (`Open Questions And Deferments`)
    - Design trace: item 4, "Add a narrow live condition adapter for conversations."
  - Validation handoff: `S4`, `unit, integration/smoke`

- [x] `C07` [conditions] Implement the condition adapter so same-named supported condition keys call the shared `q` facade methods needed by the milestone fixtures, returning `true` only for exact true query results and `false` for valid non-true query results.
  - Trace:
    - "The live condition adapter should mirror supported condition keys to same-named methods on the shared `q` facade where practical." (`Condition Semantics`)
    - "For this milestone, the adapter should support only the shared `q` facade methods needed by the milestone fixtures, using same-named condition keys." (`Condition Semantics`)
    - Design trace: item 4, "The adapter should return `true` only for exact true outcomes" and "Ordinary unmet conditions should return `false` as normal conversation outcomes."
  - Validation handoff: `S4`, `unit, integration/smoke`

- [ ] `C08` [conditions] Implement the condition adapter error boundary so malformed condition shape, unsupported condition operator, missing required `q` method, or evaluator exception becomes an integration failure rather than ordinary `false`.
  - Trace:
    - "Treat malformed condition shape, unsupported condition operator, missing required `q` method, or condition-evaluator exceptions as integration failures." (`Constraints`)
    - "Unsupported or malformed condition data is an integration failure, not a false guard." (`Condition Semantics`)
    - Design trace: item 4, "Malformed or unsupported condition shapes should surface as maintainer-facing integration failures rather than silently becoming progression decisions."
  - Validation handoff: `S4`, `unit, integration/smoke`

- [ ] `C09` [query] Extract the existing `createQueryFacade(...)` implementation from `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` into `bundles/bundle-rantamuta/lib/helpers/query-facade.js`.
  - Trace:
    - "`bundles/bundle-rantamuta/lib/helpers/query-facade.js` - Expected new shared home for `createQueryFacade(...)`." (`Implementation Surfaces`)
    - "extract the `q` facade into `lib/helpers/query-facade.js` and import that facade directly" (`Risks And Mitigations`)
    - Design trace: item 5, "lift the existing `createQueryFacade(...)` implementation out of `predicate-runtime.js` into `bundles/bundle-rantamuta/lib/helpers/query-facade.js`."
  - Validation handoff: `S5`, `unit, contract/parity`

- [ ] `C10` [query] Update `bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js` to import `createQueryFacade(...)` from `query-facade.js` while preserving existing predicate-runtime behavior and diagnostics.
  - Trace:
    - "`predicate-runtime.js` - Expected to stop owning the shared `q` facade after extraction." (`Implementation Surfaces`)
    - "Preserve existing predicate-runtime diagnostics unless an explicit compatibility decision authorizes changing them." (`Constraints`)
    - Design trace: item 5, "`predicate-runtime.js` should import the shared facade rather than remain the owner of `q`"; item 5 caveat about predicate diagnostic wording.
  - Validation handoff: `S5`, `unit, contract/parity`

- [ ] `C11` [query] Build a shared `q` facade in `tryDirectedConversation(...)` from live command scope: player/actor, NPC, room, area, and world/state.
  - Trace:
    - "Shared read-only `q` facade construction from live command scope." (`In Scope`)
    - "`bundles/bundle-rantamuta/lib/helpers/query-facade.js` - Expected to be imported by `predicate-runtime.js` and the directed-speech conversation path." (`Implementation Surfaces`)
    - Design trace: item 5, "Build the shared read-only `q` facade from live command scope: actor/player, NPC, room, area, and world/state."
  - Validation handoff: `S5`, `integration/smoke, contract/parity`

- [ ] `C12` [runtime] Pass the live `conditionEvaluator` and `q` from `tryDirectedConversation(...)` into `evaluateConversationRuntime(...)`.
  - Trace:
    - "`directed-speech.js` - Expected to build/pass `conditionEvaluator` and `q` into `evaluateConversationRuntime(...)`." (`Implementation Surfaces`)
    - "`conversation-runtime.js` - Already accepts optional `conditionEvaluator` and `q`." (`Implementation Surfaces`)
    - Design trace: item 6, "Pass `conditionEvaluator` and `q` into `evaluateConversationRuntime(...)`."
  - Validation handoff: `S6`, `integration/smoke`

- [ ] `C13` [failure] Preserve the existing `evaluation.ok === false` path in `tryDirectedConversation(...)` so condition-evaluation failures log through `CONVERSATION_DIRECTED_SPEECH <code>: <message>` and return `null`.
  - Trace:
    - "`directed-speech.js` - Expected to keep maintainer-facing failures on the existing `CONVERSATION_DIRECTED_SPEECH <code>: <message>` path." (`Implementation Surfaces`)
    - "`conversation-runtime.js` - Expected to continue converting condition-evaluator throws into `CONVERSATION_RUNTIME_CONDITION_EVALUATION_FAILED`." (`Implementation Surfaces`)
    - Design trace: item 7, "The live directed-speech seam should then log that runtime failure through the existing `CONVERSATION_DIRECTED_SPEECH <code>: <message>` path and return `null`."
  - Validation handoff: `S6`, `integration/smoke`

- [ ] `C14` [guards] Preserve ordinary false-guard behavior so a well-formed false guard produces no maintainer-facing failure and does not by itself produce a conversation-state write.
  - Trace:
    - "Treat a well-formed condition that evaluates to `false` as normal authored conversation flow, not as a maintainer-facing failure." (`Constraints`)
    - "A well-formed false guard is a normal conversation outcome: it does not emit maintainer-facing failure logs and does not mutate persisted conversation state by itself." (`Acceptance Criteria`)
    - Design trace: item 8, "Ensure ordinary false guard results are normal conversation outcomes, not maintainer-facing failures."
  - Validation handoff: `S6`, `unit, integration/smoke`

- [ ] `C15` [routing] Preserve exact-event authority in the live path so a passing exact guarded event is selected instead of `events.default`.
  - Trace:
    - "`say <action> to <npc>` can select an exact guarded conversation event when the guard passes." (`Acceptance Criteria`)
    - "Live guard/condition wiring for exact events, `events.default`, and `auto` settling." (`In Scope`)
    - Design trace: item 9, "Verify exact guarded event selection works through `say <action> to <npc>`."
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C16` [routing] Preserve authored `events.default` fallback in the live path when an exact guarded event is present but unavailable.
  - Trace:
    - "A failed guarded exact event can fall through to authored `events.default` when a usable default route exists." (`Acceptance Criteria`)
    - "Treat a well-formed condition that evaluates to `false` as normal authored conversation flow" (`Constraints`)
    - Design trace: item 10, "Verify failed guarded exact events can fall through to authored `events.default` when present."
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C17` [routing] Preserve guarded `events.default` behavior in the live path for unmatched spoken actions.
  - Trace:
    - "Guarded `events.default` works through live directed speech." (`Acceptance Criteria`)
    - "If no matching conversation route is available, addressed speech falls back to ordinary `say` behavior." (`Acceptance Criteria`)
    - Design trace: item 11, "Verify guarded `events.default` works through live directed speech."
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C18` [routing] Preserve evaluator-owned guarded `auto` settling in the live path and use `evaluation.settledState` for the structural conversation-state write.
  - Trace:
    - "Guarded `auto` settling works through live directed speech after a selected event lands in an intermediate state." (`Acceptance Criteria`)
    - "`conversation-state.js` - Source of the structural persisted conversation-state write." (`Implementation Surfaces`)
    - Design trace: item 12, "Verify guarded `auto` settling works through live directed speech."
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C19` [fallback] Preserve `tryDirectedConversation(...)` returning `null` when evaluation produces no selected transition so `commands/say.js` falls back to ordinary addressed `say`.
  - Trace:
    - "If no matching conversation route is available, addressed speech falls back to ordinary `say` behavior." (`Acceptance Criteria`)
    - "Keep `commands/say.js` narrow ... and otherwise fall back to ordinary addressed speech." (`Constraints`)
    - Design trace: item 13, "Verify no matching conversation route still falls back to ordinary addressed `say`."
  - Validation handoff: `S7`, `integration/smoke, contract/parity`

- [ ] `C20` [transaction] Preserve operation ordering in `tryDirectedConversation(...)` so lowered authored operations precede the final `createSetConversationStateInstruction(...)` operation.
  - Trace:
    - "Successful conversation speech commits authored effects before the structural persisted conversation-state write to the settled state." (`Acceptance Criteria`)
    - "`conversation-state.js` - Source of the structural persisted conversation-state write." (`Implementation Surfaces`)
    - Design trace: item 14, "Verify successful conversation speech commits authored effects before writing the settled persisted conversation state."
  - Validation handoff: `S8`, `integration/smoke, contract/parity`

- [ ] `C21` [transaction] Preserve failure handling in `tryDirectedConversation(...)` so failed condition evaluation or authored-instruction lowering returns before building any conversation-state write operation.
  - Trace:
    - "Failed condition lowering, condition evaluation, or authored-instruction lowering does not mutate persisted conversation state." (`Acceptance Criteria`)
    - "Malformed or unsupported guard data is surfaced through the existing maintainer-facing directed-speech failure path and does not produce a conversation-state write." (`Acceptance Criteria`)
    - Design trace: item 15, "Verify failed lowering/evaluation does not mutate persisted conversation state."
  - Validation handoff: `S8`, `integration/smoke, contract/parity`

- [ ] `C22` [audit] Confirm the live milestone path has no runtime dependency on engagement records, menu rendering, numeric input interception, or `talk`.
  - Trace:
    - "The live milestone path does not introduce or depend on engagement records, menu rendering, numeric input interception, or `talk`." (`Acceptance Criteria`)
    - "Conversation engagement records or engagement lifecycle." (`Out of Scope`)
    - Design trace: item 16, "Verify the milestone does not introduce or depend on engagement records, menu rendering, numeric input interception, or `talk`."
  - Validation handoff: `S9`, `contract/parity`

- [ ] `C23` [docs] Update active conversation planning docs so the remaining milestone is described as directed speech plus live guard wiring, with engagement discussions removed, superseded, or archived as appropriate.
  - Trace:
    - "Documentation alignment so active conversation plans describe the milestone as directed speech plus live guard wiring." (`In Scope`)
    - "Active planning docs describe the remaining milestone as directed speech plus live guard wiring." (`Acceptance Criteria`)
    - Design trace: item 17, "Update active planning docs to describe the remaining milestone as directed speech plus live guard wiring."
  - Validation handoff: `S9`, `contract/parity`

- [ ] `C24` [records] Add the required `CHANGELOG.md` entry for live addressed-`say` conversation behavior when implementation changes the command surface.
  - Trace:
    - "Update `CHANGELOG.md` when the behavior is implemented, because live gameplay command behavior changes." (`Compatibility And Records`)
    - "This milestone is user-visible because it changes live gameplay behavior for addressed `say` when the addressed NPC has a valid conversation route." (`Compatibility And Records`)
    - Design trace: item 17 documentation-alignment neighborhood; plan-required record with no separate design checklist item.
  - Validation handoff: `S9`, `contract/parity`

## Behavior Slices

- `S1`
  - Goal: preserve the directed-speech-only command surface.
  - Items: `C01`.
  - Type: behavior

- `S2`
  - Goal: remove live engagement dependency and classify remaining engagement-shaped artifacts.
  - Items: `C02`, `C03`, `C04`.
  - Type: mechanical

- `S3`
  - Goal: keep addressed speech routed through the conversation-owned seam.
  - Items: `C05`.
  - Type: behavior

- `S4`
  - Goal: add the live conversation condition adapter with correct true/false/error semantics.
  - Items: `C06`, `C07`, `C08`.
  - Type: behavior

- `S5`
  - Goal: extract and reuse the shared read-only `q` facade without changing predicate-runtime semantics.
  - Items: `C09`, `C10`, `C11`.
  - Type: behavior

- `S6`
  - Goal: wire live condition evaluation into directed speech while preserving error and false-guard behavior.
  - Items: `C12`, `C13`, `C14`.
  - Type: behavior

- `S7`
  - Goal: preserve live exact/default/auto routing and ordinary addressed-say fallback.
  - Items: `C15`, `C16`, `C17`, `C18`, `C19`.
  - Type: behavior

- `S8`
  - Goal: preserve transactional ordering and no-state-write failure behavior.
  - Items: `C20`, `C21`.
  - Type: behavior

- `S9`
  - Goal: complete milestone audit, docs alignment, and required records.
  - Items: `C22`, `C23`, `C24`.
  - Type: mechanical
