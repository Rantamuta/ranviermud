# Conversation Phase 3 Event Evaluation Runtime Checklist

## Status

- Status: active
- Scope: implementation checklist for the conversation event evaluation runtime
- Source plan: [ConversationPhase3EventEvaluationRuntimePlan.md](docs/plans/ConversationPhase3EventEvaluationRuntimePlan.md)
- In Scope:
  - add a pure conversation evaluator under `bundles/bundle-rantamuta/lib/session/`
  - resolve current state, visible events, exact-event/default outcomes, `onEntry`, `auto`, `final`, and trace data
  - add the narrow plain-data `deepClone` and `deepFreeze` helper pair used by this phase
  - add minimal validation and bundle-validation support needed for deterministic execution
  - update [ConversationDSL.md](docs/plans/ConversationDSL.md) where the approved phase 3 semantics intentionally sharpened the wording
- Out of Scope:
  - `talk`, directed speech interception, menus, selector interception, and engagement lifecycle cleanup
  - executing effects or dispatching authored output
  - introducing any conversation-specific query surface outside `q.*`
  - engine-wide dynamic reload work
- Acceptance Criteria:
  - the evaluator can inspect or evaluate one loaded conversation for one player/NPC pair without a command surface
  - `events.default` applies only when no exact event produces a selected transition
  - `auto` routing settles deterministically and reports both immediate destination and final settled state
  - bundle validation surfaces conversation problems early while runtime still relies on lazy lookup
  - phase 3 leaves command behavior unchanged

## Checklist

- [ ] `C01` [docs] Update [ConversationDSL.md](docs/plans/ConversationDSL.md) so its execution wording matches the approved phase 3 plan where the plan intentionally became more precise.
  - Trace:
    - "Add one documentation-alignment task to update `ConversationDSL.md` where needed so its wording matches the approved phase 3 execution plan before implementation drifts from planning intent." (`In Scope`)
    - "Any wording in `ConversationDSL.md` that conflicts with the approved phase 3 execution contract is updated before checklist drift can carry the mismatch into implementation." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `contract/parity`

- [ ] `C02` [helpers] Review [deep-clone.js](bundles/bundle-rantamuta/lib/helpers/deep-clone.js) for conformance to this phase's narrow plain-data contract, and only add or narrow behavior where the existing helper does not already satisfy that contract.
  - Trace:
    - "Add a generally usable deep-clone utility for the same narrow plain-data shapes used by the deep-freeze utility in this phase." (`In Scope`)
    - "Here, `deep-clone utility` means a helper that copies only the narrow plain-data shapes supported in this phase and rejects unsupported complex values explicitly." (`In Scope`)
  - Validation handoff: `S2`, `unit`

- [ ] `C03` [helpers] Review [deep-freeze.js](bundles/bundle-rantamuta/lib/helpers/deep-freeze.js) for conformance to this phase's clone-and-freeze contract, and only add or narrow behavior where the existing helper does not already satisfy that contract.
  - Trace:
    - "Add a generally usable deep-freeze utility and matching branded read-only type for use in this phase's read-only boundaries." (`In Scope`)
    - "The deep-freeze utility must be light-weight ... return a new deeply frozen clone rather than freezing the caller's original object." (`Constraints`)
    - "must use the narrow deep-clone helper to produce frozen read-only copies without mutating the source" (`Implementation Surfaces`)
  - Validation handoff: `S2`, `unit, contract/parity`

- [ ] `C04` [runtime] Add a file-header JSDoc block to [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) that explains, in plain language, what the module does and what it does not do so a reader can identify the file quickly without reading the implementation.
  - Trace:
    - "This plan is about the conversation `brain`, not the player-facing command shell." (`Intent`)
    - "must remain a pure evaluator surface rather than a command, menu, or dispatch integration layer" (`Implementation Surfaces`)
  - Validation handoff: `S3`, `contract/parity`

- [ ] `C05` [runtime] Add the runtime-owned evaluator module in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) with one stable public evaluator surface for current-state inspection and exact-event evaluation.
  - Trace:
    - "Add one runtime-owned conversation evaluation module under `bundles/bundle-rantamuta/lib/session/`." (`In Scope`)
    - "must remain a pure evaluator surface rather than a command, menu, or dispatch integration layer" (`Implementation Surfaces`)
    - "support both current-state inspection and exact-event evaluation without changing command behavior" (`Implementation Surfaces`)
  - Validation handoff: `S3`, `unit, contract/parity`

- [ ] `C06` [runtime] Implement current-state resolution in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) using persisted player progress when present and authored `initial` otherwise.
  - Trace:
    - "Resolve the current conversation state for a specific player and specific NPC by: using persisted conversation state ... when present; otherwise using the authored `initial` state" (`In Scope`)
  - Validation handoff: `S3`, `unit`

- [ ] `C07` [runtime] Implement explicit failure for persisted-progress drift in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) so missing stored state ids do not silently reset to `initial`.
  - Trace:
    - "Define failure behavior for persisted progress drift." (`In Scope`)
    - "If persisted progress points at a missing state, the evaluator fails explicitly with a stable error result and does not silently reset to `initial`." (`Acceptance Criteria`)
  - Validation handoff: `S3`, `unit`

- [ ] `C08` [runtime] Implement visible-event enumeration in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) so authored order is preserved after filtering hidden `default` and failed conditions.
  - Trace:
    - "Compute visible events in the order they are written in the authored file." (`In Scope`)
    - "Here, `visible events` means authored events that: are not the reserved hidden `default` fallback; pass their own read-only condition ...; remain in the same authored order after filtering" (`In Scope`)
  - Validation handoff: `S3`, `unit`

- [ ] `C09` [runtime] Implement exact-event lookup and the single-transition shorthand in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js).
  - Trace:
    - "Support exact event matching by authored event id." (`In Scope`)
    - "Support the single-transition event form" (`In Scope`)
  - Validation handoff: `S4`, `unit`

- [ ] `C10` [runtime] Implement ordered guarded-transition selection in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) so the first passing transition always wins.
  - Trace:
    - "Support the guarded `transitions:` form: evaluate transitions in authored order; first passing transition wins" (`In Scope`)
    - "For an event using `transitions:`, the first passing transition in authored order is always chosen." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit`

- [ ] `C11` [runtime] Implement hidden `events.default` handling in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) so it applies only when no exact event produces a selected transition and its own condition passes.
  - Trace:
    - "Support hidden `events.default` fallback when: no exact event in the current state produced a selected transition; the default condition, if present, passes" (`In Scope`)
    - "`events.default` is considered only when no exact event in the current state produces a selected transition." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit`

- [ ] `C12` [runtime] Return transition effects and destination-state `onEntry` effects as data only from [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js), without executing them.
  - Trace:
    - "Support state `onEntry.effects` as returned data only." (`In Scope`)
    - "transition effects and state-entry effects as returned data only" (`In Scope`)
    - "The evaluator itself does not mutate world state ... and does not dispatch output." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit, contract/parity`

- [ ] `C13` [runtime] Implement deterministic `auto` settling in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) with visited-state detection, a 32-hop hard cap, and trace reporting of visited states and failure reason.
  - Trace:
    - "Support `auto` routing after `onEntry`." (`In Scope`)
    - "For this phase, `auto` settling must be deterministic: fail explicitly if the same state is revisited ... also fail explicitly if one evaluation step exceeds a hard cap of 32 `auto` hops ... record the visited states and the failure reason in the trace" (`In Scope`)
  - Validation handoff: `S4`, `unit`

- [ ] `C14` [runtime] Implement final-state handling in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) so final states report clearly, produce no visible events, and still preserve authored state-entry effects as returned data.
  - Trace:
    - "Support final states." (`In Scope`)
    - "Final states are reported clearly and do not produce visible events." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit`

- [ ] `C15` [runtime] Finalize the evaluator result shape in [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) so it reports source state, selected event, selected transition, immediate destination state, settled state, final-state flag, visible events, and structured trace.
  - Trace:
    - "Define one stable output shape for the evaluator" (`In Scope`)
    - "The evaluator reports both the immediate destination state and the final settled state after any `auto` routing." (`Acceptance Criteria`)
    - "The evaluator returns a stable trace that is detailed enough for tests and later preview/debug use." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit`

- [ ] `C16` [validation] Extend [conversation-definition-validation.js](bundles/bundle-rantamuta/lib/session/conversation-definition-validation.js) only where needed so malformed event and `auto` shapes are rejected before the evaluator would need to guess.
  - Trace:
    - "Add the smallest validation extensions needed so the evaluator does not need to guess about malformed authored shapes." (`In Scope`)
    - "Possible small validation expansion in `conversation-definition-validation.js` ... only where required so the evaluator does not need to guess about authored shape" (`Implementation Surfaces`)
  - Validation handoff: `S5`, `unit, contract/parity`

- [ ] `C17` [query] Constrain phase-3 condition evaluation to the shared `q.*` contract, and if implementation uncovers a missing read, pause and obtain explicit approval before changing [predicate-runtime.js](bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js).
  - Trace:
    - "Any condition support used in this phase must align with the shared read-only `q.*` query surface rather than introducing a conversation-local condition API." (`Constraints`)
    - "There is no conversation-specific query surface outside `q.*` in this phase." (`Constraints`)
    - "If a needed read does not already exist in `q.*`, it must be added to the shared query facade itself ... and that expansion requires explicit maintainer approval" (`Constraints`)
  - Validation handoff: `S5`, `contract/parity`

- [ ] `C18` [fixtures] Add purpose-built conversation fixtures under [conversations](bundles/bundle-rantamuta/areas/test/conversations) for event ordering, guarded transitions, hidden default, `auto`, and final-state handling.
  - Trace:
    - "Add conversation fixtures in the test bundle that cover more than the current minimal `actorPlanner` file." (`In Scope`)
    - "New or expanded test fixtures under `bundles/bundle-rantamuta/areas/test/conversations/`" (`Implementation Surfaces`)
  - Validation handoff: `S5`, `integration/smoke`

- [ ] `C19` [bundle-validation] Add conversation validation integration to [validate-bundles.js](util/validate-bundles.js) using the same loading path as runtime use and without replacing lazy lookup during play.
  - Trace:
    - "Add bundle-validation support for conversations so maintainers can surface broken or non-executable conversation definitions before runtime interaction." (`In Scope`)
    - "Keep lazy runtime lookup authoritative for actual conversation use." (`In Scope`)
    - "`validate-bundles.js` ... should surface maintainer-facing findings without changing runtime load authority" (`Implementation Surfaces`)
  - Validation handoff: `S5`, `integration/smoke, contract/parity`

## Behavior Slices

- `S1`
  - Goal: align the DSL wording with the approved phase 3 execution contract before code implementation drifts.
  - Items: `C01`.
  - Type: mechanical

- `S2`
  - Goal: establish the narrow plain-data clone/freeze helper boundary used by phase 3.
  - Items: `C02`, `C03`.
  - Type: behavior

- `S3`
  - Goal: create the evaluator entry surface and state-resolution behavior without command-surface coupling.
  - Items: `C04`, `C05`, `C06`, `C07`, `C08`.
  - Type: behavior

- `S4`
  - Goal: complete deterministic transition settling, returned effect data, and trace/result shape for the evaluator core.
  - Items: `C09`, `C10`, `C11`, `C12`, `C13`, `C14`, `C15`.
  - Type: behavior

- `S5`
  - Goal: lock runtime boundaries around validation, query-surface use, fixtures, and bundle validation.
  - Items: `C16`, `C17`, `C18`, `C19`.
  - Type: behavior
