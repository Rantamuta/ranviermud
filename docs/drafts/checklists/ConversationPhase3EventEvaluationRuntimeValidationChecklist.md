# Conversation Phase 3 Event Evaluation Runtime Validation Checklist

## Status

- Status: active
- Scope: implementation checklist for missing phase 3 validation evidence
- Source plan: [ConversationPhase3EventEvaluationRuntimePlan.md](docs/plans/ConversationPhase3EventEvaluationRuntimePlan.md)
- Source checklist: [ConversationPhase3EventEvaluationRuntimeChecklist.md](docs/drafts/checklists/ConversationPhase3EventEvaluationRuntimeChecklist.md)
- Source matrix: [ConversationPhase3EventEvaluationRuntimeValidationMatrix.md](docs/drafts/checklists/ConversationPhase3EventEvaluationRuntimeValidationMatrix.md)
- In Scope:
  - add the missing automated proof for phase 3 helper, runtime, and bundle-validation behavior
  - keep existing proof where it already satisfies the matrix instead of rewriting tests for naming alone
  - add only the smallest new validation needed to close the matrix gaps
- Out of Scope:
  - changing phase 3 runtime behavior unless a missing proof reveals a real defect
  - expanding the conversation query surface beyond the existing shared `q.*` contract
  - revising the phase 3 plan, readiness plan, or matrix beyond what implementation needs
- Acceptance Criteria:
  - every currently missing proof target in the validation matrix has concrete validation evidence
  - helper, runtime, and bundle-validation coverage prove the approved phase 3 contract without broad test churn
  - the implementation remains inside the approved phase 3 scope

## Checklist

- [ ] `V01` [helpers] Extend [deep.freeze.helper.test.js](bundles/bundle-rantamuta/tests/deep.freeze.helper.test.js) only where needed so the test suite proves the branded `DeepFrozen` typedef remains usable for evaluator-facing APIs.
  - Trace:
    - "Add a generally usable deep-freeze utility and matching branded read-only type for use in this phase's read-only boundaries." (`In Scope`)
    - "Normalized conversation definitions used by the evaluator can be converted into branded deep-frozen copies and passed through the evaluator as read-only inputs." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit, contract/parity`

- [ ] `V02` [runtime] Extend [conversation.runtime.test.js](bundles/bundle-rantamuta/tests/conversation.runtime.test.js) only where needed so the suite proves transition effects are returned as data only, the shared `q.*` context is the only query surface exposed to conditions, and the trace records the important settled-evaluation steps and auto-routing failure details.
  - Trace:
    - "The evaluator itself does not mutate world state, does not write player metadata, does not change engagement state, and does not dispatch output." (`Acceptance Criteria`)
    - "Any condition support used in this phase must align with the shared read-only `q.*` query surface rather than introducing a conversation-local condition API." (`Constraints`)
    - "The evaluator returns a stable trace that is detailed enough for tests and later preview/debug use." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `unit, contract/parity`

- [ ] `V03` [bundle-validation] Extend [conversation.definition.service.test.js](bundles/bundle-rantamuta/tests/conversation.definition.service.test.js) only where needed so bundle validation proves evaluator-readiness failures are surfaced and the validator uses the same runtime loading path rather than a parallel parser.
  - Trace:
    - "Add bundle-validation support for conversations so maintainers can surface broken or non-executable conversation definitions before runtime interaction." (`In Scope`)
    - "Actual runtime conversation use still depends on lazy lookup through the conversation-definition service rather than on startup eager load." (`Acceptance Criteria`)
  - Validation handoff: `S3`, `integration/smoke, contract/parity`

## Behavior Slices

- `S1`
  - Goal: close the remaining helper-level proof gap around the branded deep-frozen type contract.
  - Items: `V01`.
  - Type: behavior

- `S2`
  - Goal: close the remaining evaluator proof gaps around returned transition effects, trace detail, and the `q.*`-only condition context.
  - Items: `V02`.
  - Type: behavior

- `S3`
  - Goal: close the remaining bundle-validation proof gaps around evaluator-readiness failures and runtime load-path reuse.
  - Items: `V03`.
  - Type: behavior
