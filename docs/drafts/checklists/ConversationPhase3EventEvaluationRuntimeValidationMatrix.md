# Conversation Phase 3 Event Evaluation Runtime Validation Matrix

## Status

- Status: active
- Scope: validation planning matrix for the conversation event evaluation runtime checklist
- Source plan: [ConversationPhase3EventEvaluationRuntimePlan.md](docs/plans/ConversationPhase3EventEvaluationRuntimePlan.md)
- Source checklist: [ConversationPhase3EventEvaluationRuntimeChecklist.md](docs/drafts/checklists/ConversationPhase3EventEvaluationRuntimeChecklist.md)

## Purpose

This companion matrix spells out what evidence should prove each checklist item is complete.

It is not an implementation checklist and it is not a command list.
Its purpose is to keep validation expectations concrete before implementation begins.

## Validation Matrix

### `C01` DSL wording alignment

- Evidence type:
  - `contract/parity`
- Proof targets:
  - [ConversationDSL.md](docs/plans/ConversationDSL.md) matches the approved phase 3 wording for `default` fallback after exact-event evaluation produces no selected transition
  - [ConversationDSL.md](docs/plans/ConversationDSL.md) matches the approved phase 3 wording for `onEntry` then `auto`
  - [ConversationDSL.md](docs/plans/ConversationDSL.md) does not leave behind wording that would pull implementation away from the approved plan

### `C02` Deep clone helper conformance

- Evidence type:
  - `unit`
- Proof targets:
  - add or keep a test `returns a new deep clone for supported plain object input`
  - add or keep a test `returns new nested objects and arrays instead of sharing mutable references`
  - add or keep a test `does not mutate the caller input`
  - add or keep a test `rejects unsupported complex values without changing the caller input`

### `C03` Deep freeze helper conformance

- Evidence type:
  - `unit`
  - `contract/parity`
- Proof targets:
  - add or keep a test `returns a frozen clone rather than freezing the caller input`
  - add or keep a test `uses the narrow deep clone helper or equivalent clone-first behavior`
  - add or keep a test `supports the branded read-only typedef expected by evaluator-facing APIs`
  - add or keep a test `rejects unsupported complex values without changing the caller input`

### `C04` `conversation-runtime.js` file header

- Evidence type:
  - `contract/parity`
- Proof targets:
  - [conversation-runtime.js](bundles/bundle-rantamuta/lib/session/conversation-runtime.js) has a file-header JSDoc block
  - the header says the module is a pure evaluator
  - the header says the module does not intercept commands, install menus, execute effects, or dispatch output

### `C05` Evaluator entry surface

- Evidence type:
  - `unit`
  - `contract/parity`
- Proof targets:
  - add a test `exports one stable public evaluator surface`
  - add a test `supports current-state inspection without command wiring`
  - add a test `supports exact-event evaluation without command wiring`

### `C06` Current-state resolution

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `uses persisted conversation state when present`
  - add a test `uses authored initial state when persisted state is absent`
  - add a test `keeps same-named NPC ids in different areas on different state paths`

### `C07` Persisted-progress drift failure

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `fails explicitly when stored progress points at a missing state`
  - add a test `does not silently reset to initial on invalid stored state`
  - add a test `does not mutate player metadata on invalid stored state`

### `C08` Visible-event enumeration

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `preserves authored event order after filtering`
  - add a test `excludes hidden default from visible events`
  - add a test `excludes events whose condition does not pass`

### `C09` Exact-event lookup and single-transition shorthand

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `selects the authored event whose id exactly matches the input event id`
  - add a test `does not match a different event by prefix or fuzzy similarity`
  - add a test `takes the target state when a conditioned single-transition event passes`
  - add a test `returns no selected transition when a conditioned single-transition event fails and no default applies`

### `C10` Guarded-transition selection

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `uses the first passing guarded transition in authored order`
  - add a test `does not continue to later guarded transitions after a passing match`
  - add a test `returns no selected guarded transition when none pass and no default applies`

### `C11` Hidden `events.default`

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `uses default when no exact event id exists in the current state`
  - add a test `uses default when an exact event exists but no transition in that event is selected`
  - add a test `does not use default when an exact event exists and succeeds`
  - add a test `uses conditioned default when its condition passes`

### `C12` Returned effects as data only

- Evidence type:
  - `unit`
  - `contract/parity`
- Proof targets:
  - add a test `returns transition effects and state-entry effects as data only`
  - add a test `does not execute returned transition effects`
  - add a test `does not execute returned onEntry effects`

### `C13` Deterministic `auto` settling

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `evaluates auto routes only after collecting onEntry effects`
  - add a test `uses the first passing auto route in authored order`
  - add a test `fails explicitly when one auto chain revisits a state`
  - add a test `fails explicitly when one auto chain exceeds the 32-hop hard cap`
  - add a test `records visited states and failure reason in the trace`

### `C14` Final-state handling

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `marks final states clearly in the evaluator result`
  - add a test `returns no visible events from a final state`
  - add a test `still reports state-entry effects for a final state when authored`

### `C15` Result shape and trace

- Evidence type:
  - `unit`
- Proof targets:
  - add a test `returns source state, destination state, settled state, visible events, and final-state flag in one stable result`
  - add a test `returns a trace object with stable top-level fields`
  - add a test `records the important evaluation steps in a stable shape`

### `C16` Definition validation extensions

- Evidence type:
  - `unit`
  - `contract/parity`
- Proof targets:
  - add a test `rejects malformed event shape`
  - add a test `rejects malformed auto shape`
  - add a test `rejects authored combinations that make evaluation order unclear`
  - add a test `keeps validation errors deterministic and code-based`

### `C17` Shared `q.*` query-surface rule

- Evidence type:
  - `contract/parity`
- Proof targets:
  - evaluator-facing condition support uses only the shared `q.*` surface
  - no conversation-local query helper API is introduced
  - if a new query read is needed, implementation records the explicit approval and extends [predicate-runtime.js](bundles/bundle-rantamuta/lib/helpers/predicate-runtime.js)

### `C18` Conversation fixtures

- Evidence type:
  - `integration/smoke`
- Proof targets:
  - add or update a fixture for authored event ordering and filtering
  - add or update a fixture for guarded transitions
  - add or update a fixture for hidden default
  - add or update a fixture for `auto`
  - add or update a fixture for final-state handling

### `C19` Bundle validation integration

- Evidence type:
  - `integration/smoke`
  - `contract/parity`
- Proof targets:
  - add a test `reports broken conversation bindings during bundle validation`
  - add a test `reports evaluator-readiness failures during bundle validation`
  - add a test `uses the same conversation loading path as runtime use rather than a parallel parser`
  - add a test `surfaces maintainer-facing findings without changing runtime lookup behavior`

## Notes

- These proof targets are intentionally concrete so implementation review can ask "what evidence should exist for this checklist item?" without inventing that answer late.
- The exact test file names may still follow repository conventions as long as the behavior evidence stays faithful to the approved plan and checklist.
