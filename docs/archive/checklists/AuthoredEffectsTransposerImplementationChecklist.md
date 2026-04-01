# Authored Effects Transposer Implementation Checklist

## Status

- Status: archived
- Scope: implement a reusable authored-effects transposer and shared validator
- Source plan: `docs/plans/AuthoredEffectsTransposerImplementationPlan.md`
- In Scope:
  - add a generic runtime-owned authored-effects subsystem under `bundles/bundle-rantamuta/lib/runtime/`
  - implement the current supported authored effect vocabulary against the live mutator/render instruction vocabulary
  - add one shared validator reusable by runtime, bundle validation, and conversation definition validation for authored `effects`
  - replace the directed-speech local effect-lowering shim with the shared transposer
  - add the planned harness support and layered integration surfaces needed for validator/transposer adoption
- Out of Scope:
  - new player command surfaces such as `talk`, numeric menus, or menu lifecycle behavior
  - new mutator or render instruction types beyond the current runtime set
  - engine-internal changes outside `bundle-rantamuta`
  - a second conversation-only effect DSL
  - fuzzy world search or a second general-purpose entity resolver
- Acceptance Criteria:
  - one generic transposer entrypoint returns canonical `operations` and `renderMessages` or structured failure
  - one shared validator entrypoint is reused by runtime consumers and bundle validation
  - current-area-relative room refs and documented implicit fields work per the DSL contract
  - the transposer emits no partial lowered output after failure
  - conversation-directed speech uses the shared transposer while conversation progress persistence remains separate

## Checklist

- [x] `C01` [harness] Add reusable authored-effects harness support under `bundles/bundle-rantamuta/tests/helpers/` so harness infrastructure is separate from later contract coverage and production implementation.
  - Trace:
    - "Add a testing harness and layered tests for validator behavior, transposition behavior, bundle-validation integration, and conversation-directed-speech integration." (`In Scope`)
    - "The preparatory testing harness, contract tests, and transposer implementation should be kept as distinct behavior slices so the harness does not quietly co-adapt with the first tests or implementation." (`Constraints`)
  - Validation handoff: `S1`, `unit`

- [x] `C02` [runtime] Add a generic authored-effects package under `bundles/bundle-rantamuta/lib/runtime/authored-effects/` that exposes shared entrypoints for authored-effect validation and transposition, plus the canonical result/diagnostic contracts those entrypoints return.
  - Trace:
    - "Add a generic runtime-owned authored-effects subsystem under `bundles/bundle-rantamuta/lib/runtime/` rather than under a conversation-only path." (`In Scope`)
    - "There is one generic transposer entrypoint that accepts authored effects plus explicit runtime context and returns canonical `operations` and `renderMessages`, or a structured failure." (`Acceptance Criteria`)
    - "There is one shared validator entrypoint for authored effect entries..." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `unit`

- [x] `C03` [resolution] Add authored-reference expansion helpers under `bundles/bundle-rantamuta/lib/runtime/authored-effects/` that map documented context symbols and expand current-area-relative room ids, while reusing existing runtime room/area/context helper logic where available and avoiding a second general-purpose entity resolver (depends on `C02`).
  - Trace:
    - "The transposer may perform only narrow authored-reference expansion required by the DSL contract..." (`Constraints`)
    - "Any broader entity lookup or disambiguation must reuse existing shared resolver architecture rather than duplicating it." (`Constraints`)
    - "Where room, area, or context-target resolution helpers already exist in runtime code, the implementation should extract or reuse them rather than copying equivalent logic into a second helper stack." (`Constraints`)
  - Validation handoff: `S2`, `unit`

- [x] `C04` [validation] Implement per-effect structural validation in the authored-effects validator for single-key effect objects, supported effect names, and effect-specific payload schemas, while keeping static validation structure-focused and reserving live resolvability checks for runtime-aware validation paths (depends on `C02`).
  - Trace:
    - "Add one shared validator that can be used: at runtime; through bundle validation / CLI validation; through conversation definition validation for authored `effects` payloads..." (`In Scope`)
    - "Static validation should stay structure-focused; runtime validation may additionally check live resolvability." (`Constraints`)
    - "If any authored effect fails validation or required resolution, the transposer returns structured failure and does not emit partial lowered output." (`Acceptance Criteria`)
  - Validation handoff: `S3`, `unit`

- [x] `C05` [conversation-validation] Update `bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js` so conversation-owned validation continues to own non-effect conversation shape while delegating authored `effects` payload checks to the shared authored-effects validator (depends on `C04`).
  - Trace:
    - "through conversation definition validation for authored `effects` payloads, without restating effect rules in a second conversation-local validator" (`In Scope`)
    - "Conversation definition validation delegates authored `effects` validation to that shared validator rather than maintaining a second effect-rule implementation." (`Acceptance Criteria`)
    - "Conversation definition validation must reuse the generic authored-effects validator for `effects` payloads rather than duplicating effect-shape rules locally." (`Constraints`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C06` [bundle-validation] Update the bundle-validation path in `util/validate-bundles.js` and any conversation validation service surface it uses so bundle validation reuses the same authored-effects validator entrypoint and runtime conversation loading path rather than a parallel bundle-only rule set (depends on `C04`, `C05`).
  - Trace:
    - "Add one shared validator that can be used: ... through bundle validation / CLI validation" (`In Scope`)
    - "Bundle validation / CLI validation: ... reuse the same authored-effects validator entrypoint used by runtime consumers rather than a parallel bundle-only rule set" (`Implementation Surfaces`)
    - "Runtime validation and bundle validation both surface invalid authored effect shapes deterministically." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `contract/parity`

- [x] `C07` [lowering-core] Implement mutation-lowering dispatch under `bundles/bundle-rantamuta/lib/runtime/authored-effects/` so supported authored mutation effects route through per-effect lowering contracts without broad switch rewrites (depends on `C02`, `C03`, `C04`).
  - Trace:
    - "The implementation is organized so new supported effects can be added effect-by-effect without rewriting unrelated lowering logic." (`Acceptance Criteria`)
    - "one registry entry or lowering function per supported effect name" (`Implementation Surfaces`)
  - Validation handoff: `S5`, `unit`

- [x] `C08` [lowering-transfer] Implement authored `transferItem` lowering under `bundles/bundle-rantamuta/lib/runtime/authored-effects/`, preserving documented field shape and explicit container/item resolution from runtime context (depends on `C07`).
  - Trace:
    - "Support the current mutation operations exposed by `mutator.js`: `transferItem` ..." (`In Scope`)
    - "The transposer lowers only to the existing mutator/render instruction sets and does not execute anything directly." (`Acceptance Criteria`)
  - Validation handoff: `S5`, `unit`

- [x] `C09` [lowering-move] Implement authored `movePlayer` lowering under `bundles/bundle-rantamuta/lib/runtime/authored-effects/`, including documented implicit player handling and current-area-relative `toRoom` expansion (depends on `C07`).
  - Trace:
    - "Support the current mutation operations exposed by `mutator.js`: `movePlayer` ..." (`In Scope`)
    - "`movePlayer` accepts current-area-relative room ids such as `toRoom: start` and resolves them to the current area during transposition." (`Acceptance Criteria`)
    - "Only documented implicit fields are inferred..." (`Acceptance Criteria`)
  - Validation handoff: `S5`, `unit`

- [x] `C10` [lowering-door] Implement authored door-operation lowering under `bundles/bundle-rantamuta/lib/runtime/authored-effects/` for `operateDoor`, `openDoor`, and `closeAndLockDoor`, including any stricter per-effect locality or targeting rules required by those contracts (depends on `C07`).
  - Trace:
    - "Support the current mutation operations exposed by `mutator.js`: `operateDoor`, `openDoor`, `closeAndLockDoor`" (`In Scope`)
    - "Some effects may impose stricter locality or targeting rules than the generic reference-expansion layer; those restrictions must be documented per effect contract rather than hidden in generic resolution behavior." (`Constraints`)
  - Validation handoff: `S5`, `unit`

- [x] `C11` [lowering-metadata] Implement authored metadata-operation lowering under `bundles/bundle-rantamuta/lib/runtime/authored-effects/` for the current supported set-player, set-room, set-area, set-world, delete-room, delete-area, and delete-world metadata effects, preserving documented implicit targets and explicit overrides (depends on `C07`).
  - Trace:
    - "Support the current mutation operations exposed by `mutator.js`: `setPlayerMetadata`, `setRoomMetadata`, `setAreaMetadata`, `setWorldMetadata`, `deleteRoomMetadata`, `deleteAreaMetadata`, `deleteWorldMetadata`" (`In Scope`)
    - "Only documented implicit fields are inferred..." (`Acceptance Criteria`)
    - "Some effects may impose stricter locality or targeting rules than the generic reference-expansion layer..." (`Constraints`)
  - Validation handoff: `S5`, `unit`

- [x] `C12` [lowering-render] Implement effect-specific render lowering under `bundles/bundle-rantamuta/lib/runtime/authored-effects/` for `broadcast` and `semanticEvent`, passing through the live render instruction contracts instead of inventing conversation-local message semantics (depends on `C02`, `C03`, `C04`).
  - Trace:
    - "Support the current render instructions exposed by `render-dispatch.js`: `broadcast`, `semanticEvent`" (`In Scope`)
    - "The transposer lowers only to the existing mutator/render instruction sets and does not execute anything directly." (`Acceptance Criteria`)
    - "The transposer emits only the existing canonical runtime outputs: ... render instructions for render dispatch" (`Intent`)
  - Validation handoff: `S5`, `unit`

- [x] `C13` [conversation] Update `bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js` to replace the local authored-effect lowering shim with the shared transposer while keeping the structural conversation progress mutation separate from authored effects (depends on `C08`, `C09`, `C10`, `C11`, `C12`).
  - Trace:
    - "Replace the narrow effect-lowering shim in `directed-speech.js` with the shared transposer." (`In Scope`)
    - "Conversation-directed speech uses the shared transposer instead of a local effect-lowering shim." (`Acceptance Criteria`)
    - "Conversation progress persistence remains a separate structural write and is not redefined as an authored effect." (`Acceptance Criteria`)
  - Validation handoff: `S6`, `integration/smoke`

## Behavior Slices

- `S1`
  - Goal: establish reusable authored-effects harness support before contract coverage and production implementation are built on top of it.
  - Items: `C01`.
  - Type: mechanical

- `S2`
  - Goal: create the generic authored-effects runtime package and the narrow reference-expansion layer it is allowed to own.
  - Items: `C02`, `C03`.
  - Type: mechanical

- `S3`
  - Goal: implement the shared authored-effects validator with deterministic structural validation and failure behavior.
  - Items: `C04`.
  - Type: behavior

- `S4`
  - Goal: wire the shared validator into conversation validation and bundle validation without creating duplicate validator paths.
  - Items: `C05`, `C06`.
  - Type: behavior

- `S5`
  - Goal: implement per-effect lowering for the current supported mutation and render instruction sets.
  - Items: `C07`, `C08`, `C09`, `C10`, `C11`, `C12`.
  - Type: behavior

- `S6`
  - Goal: switch conversation-directed speech from its local lowering shim to the shared transposer while keeping conversation state persistence separate.
  - Items: `C13`.
  - Type: behavior
