# Authored Effects Transposer Implementation Plan

## Status

- Status: archived
- Scope: formal plan for a reusable authored-effects transposer and shared validator

## Goal

Build a reusable authored-effects transposer that turns YAML-authored DSL effects into the existing runtime mutation operations and render instructions, with shared validation for runtime use and bundle validation.

## Intent

In plain language, this work should give designers one honest way to author effects in YAML and give runtime systems one honest way to consume them.

That means:

- designers write effect entries using the same instruction names and field names the runtime already understands
- the transposer validates those authored entries before they are trusted
- the transposer resolves symbolic authored values, such as `toRoom: start`, against explicit runtime context
- the transposer emits only the existing canonical runtime outputs:
  - mutation operations for the mutator
  - render instructions for render dispatch
- conversation-directed speech stops owning a local special-case lowering shim and instead uses this shared service

Success means the project has one mechanical bridge from authored YAML into runtime instructions, not a growing collection of subsystem-local lowerers.

## In Scope

- Add a generic runtime-owned authored-effects subsystem under `bundles/bundle-rantamuta/lib/runtime/` rather than under a conversation-only path.
- Define and implement the current supported authored effect vocabulary so it maps to the live runtime instruction vocabulary.
- Support the current mutation operations exposed by `mutator.js`:
  - `transferItem`
  - `movePlayer`
  - `operateDoor`
  - `openDoor`
  - `closeAndLockDoor`
  - `setPlayerMetadata`
  - `setRoomMetadata`
  - `setAreaMetadata`
  - `setWorldMetadata`
  - `deleteRoomMetadata`
  - `deleteAreaMetadata`
  - `deleteWorldMetadata`
- Support the current render instructions exposed by `render-dispatch.js`:
  - `broadcast`
  - `semanticEvent`
- Support the DSL rules already captured in [`ConversationDSL.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md), including:
  - single-key effect objects
  - runtime instruction names and field names as the authored surface
  - implicit omission of only those fields the effect contract says are safe to infer
  - current-area-relative room references for bare room ids such as `toRoom: start`
  - fully qualified refs such as `toRoom: "codex:start"` for explicit remote targeting
- Add one shared validator that can be used:
  - at runtime
  - through bundle validation / CLI validation
  - through conversation definition validation for authored `effects` payloads, without restating effect rules in a second conversation-local validator
- Replace the narrow effect-lowering shim in [`directed-speech.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js) with the shared transposer.
- Add a testing harness and layered tests for validator behavior, transposition behavior, bundle-validation integration, and conversation-directed-speech integration.
- Keep authored effect lowering separate from structural conversation state persistence.

## Out of Scope

- New player command surfaces such as `talk`, numeric menus, or menu lifecycle behavior.
- New mutator instruction types or new render instruction types beyond the current runtime set.
- Engine-internal changes outside `bundle-rantamuta`.
- A broad quest or narrative runtime rollout beyond making the transposer reusable for those future systems.
- A second conversation-only effect DSL.
- Authoring sugar that invents alternate names for effects already represented by current runtime instruction names.
- Full global world search during transposition.
- Making bundle validation the only authority for correctness.
- Redesigning the mutator or render-dispatch execution model.

## Acceptance Criteria

- There is one generic transposer entrypoint that accepts authored effects plus explicit runtime context and returns canonical `operations` and `renderMessages`, or a structured failure.
- There is one shared validator entrypoint for authored effect entries, and the same validator rules are used by runtime consumers and bundle validation.
- Conversation definition validation delegates authored `effects` validation to that shared validator rather than maintaining a second effect-rule implementation.
- Authored effects can be written using the current runtime instruction names and field names without inventing a parallel vocabulary.
- `movePlayer` accepts current-area-relative room ids such as `toRoom: start` and resolves them to the current area during transposition.
- Fully qualified refs such as `toRoom: "codex:start"` remain valid for explicit remote targeting.
- Only documented implicit fields are inferred; the transposer does not silently invent missing values outside those contracts.
- If any authored effect fails validation or required resolution, the transposer returns structured failure and does not emit partial lowered output.
- The transposer lowers only to the existing mutator/render instruction sets and does not execute anything directly.
- Conversation-directed speech uses the shared transposer instead of a local effect-lowering shim.
- Conversation progress persistence remains a separate structural write and is not redefined as an authored effect.
- Runtime validation and bundle validation both surface invalid authored effect shapes deterministically.
- The implementation is organized so new supported effects can be added effect-by-effect without rewriting unrelated lowering logic.

## Constraints

- Preserve the repository runtime/content boundary from [`AGENTS.md`](/home/rendall/mud/ranviermud/AGENTS.md):
  - runtime lowering lives under `lib/**`
  - authored YAML remains in authored content surfaces
  - runtime code must not hardcode area-specific content ids
- Keep this work inside `bundle-rantamuta` plus the repository's existing validation/tooling surfaces; do not modify engine internals.
- The transposer must stay mechanical:
  - validate shape
  - resolve references from explicit context
  - emit canonical instructions
  - stop on failure
- The transposer must not introduce a second general-purpose entity resolver.
- The transposer may perform only narrow authored-reference expansion required by the DSL contract, such as:
  - mapping documented context symbols like `player`, `actor`, `room`, and `area` to values already supplied in transposition context
  - expanding current-area-relative room ids into fully qualified room refs
- Any broader entity lookup or disambiguation must reuse existing shared resolver architecture rather than duplicating it.
- The transposer must not perform fuzzy search, name disambiguation, or free-form world lookup.
- Current-area-relative room expansion belongs in the transposer, not in `mutator.js` or `render-dispatch.js`.
- Some effects may impose stricter locality or targeting rules than the generic reference-expansion layer; those restrictions must be documented per effect contract rather than hidden in generic resolution behavior.
- Static validation should stay structure-focused; runtime validation may additionally check live resolvability.
- Conversation definition validation must reuse the generic authored-effects validator for `effects` payloads rather than duplicating effect-shape rules locally.
- Conversation-specific state persistence stays outside the generic authored-effects subsystem.
- Implementation must follow repository test-first norms.
- The preparatory testing harness, contract tests, and transposer implementation should be kept as distinct behavior slices so the harness does not quietly co-adapt with the first tests or implementation.
- "Shared reference-resolution helpers" in this plan means narrow authored-reference expansion helpers only.
- Where room, area, or context-target resolution helpers already exist in runtime code, the implementation should extract or reuse them rather than copying equivalent logic into a second helper stack.
- The current supported instruction lists in this plan are a snapshot of the live runtime vocabulary at planning time, not a second permanent instruction-contract document.

## Implementation Surfaces

- New generic authored-effects runtime package under `bundles/bundle-rantamuta/lib/runtime/`
  - validator
  - transposer
  - authored-reference expansion helpers
  - one validator shape per supported effect name
  - effect-specific lowering contracts/handlers
  - one registry entry or lowering function per supported effect name
- Conversation consumer integration:
  - [`bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js)
  - [`bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js)
  - any conversation definition service surface needed to expose bundle-validation findings without creating a second validator path
  - the conversation validator should delegate authored `effects` checks to the generic authored-effects validator
- Bundle validation / CLI validation:
  - [`util/validate-bundles.js`](/home/rendall/mud/ranviermud/util/validate-bundles.js)
  - existing conversation bundle-validation hook surfaces
  - reuse the same authored-effects validator entrypoint used by runtime consumers rather than a parallel bundle-only rule set
- Tests:
  - `bundles/bundle-rantamuta/tests/authored.effects.validation.test.js`
  - `bundles/bundle-rantamuta/tests/authored.effects.transposer.test.js`
  - any shared test harness/helper files needed for those tests
  - conversation validation and directed-speech integration tests
  - a small number of dispatch-level tests if needed to prove commit-before-render behavior remains intact
- Planning/design alignment:
  - [`docs/plans/ConversationDSL.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md)
  - [`docs/drafts/AuthoredEffectsTransposerDesign.md`](/home/rendall/mud/ranviermud/docs/drafts/AuthoredEffectsTransposerDesign.md)

## Validation Strategy

This plan changes runtime behavior and validation behavior, so it requires layered evidence.

### Unit / Contract

Add focused validator tests and focused transposer tests.

Pass means:

- supported effect names and payloads are accepted
- unsupported or malformed effect entries fail deterministically
- reference resolution follows the documented DSL contract
- emitted mutation operations and render instructions exactly match the expected canonical output

Fail means:

- the transposer emits partial output after a bad effect
- the transposer silently coerces bad authored input
- implicit fields or reference expansion occur outside the documented contract

### Integration / Smoke

Extend conversation validation and conversation-directed-speech tests.

Pass means:

- authored conversation effects are validated through the shared validator
- directed speech can lower valid authored effects into normal command envelopes
- directed speech logs maintainer-facing failures and falls through according to the existing conversation-directed-speech behavior contract

Fail means:

- conversation keeps a separate effect-lowering path
- conversation validation and runtime transposition disagree about authored validity

### Contract / Parity

Bundle validation must use the same authored-effect validation rules as runtime consumers.

Pass means:

- bundle validation surfaces structural authored-effect findings using the shared validator path
- runtime and bundle validation agree on structural failures for the same authored effect data

Fail means:

- a second validator path drifts from runtime rules
- bundle validation accepts authored shapes runtime would reject, or vice versa

### Repository Validation

As behavior-changing work, implementation from this plan must run:

- `npm test`
- `npm run ci:local`

Interim development may use narrower test commands and, when needed, `npm run ci:local -- --force`, but final validation must satisfy the repository requirements in [`AGENTS.md`](/home/rendall/mud/ranviermud/AGENTS.md).

## Risks and Mitigations

### Risk: DSL and runtime drift apart

If the transposer invents names or field shapes that do not match the runtime instruction contracts, authored YAML will become a second vocabulary.

Mitigation:

- keep runtime instruction names and field names as the authored contract
- keep [`ConversationDSL.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md) aligned with the implementation plan

### Risk: the plan becomes a second instruction-contract document

If this plan is treated as the long-term canonical home of mutator/render field contracts, it can drift from the actual runtime instruction contracts.

Mitigation:

- treat the supported instruction lists here as a planning-time snapshot
- keep the implementation aligned to the live runtime contracts in `mutator.js` and `render-dispatch.js`
- if maintainers need a stable long-lived instruction contract, author that as a dedicated document rather than letting this plan become one by accident

### Risk: generic layer accumulates consumer-specific shortcuts

If conversation-only assumptions leak into the generic transposer, future quest/narrative consumers will inherit the wrong behavior.

Mitigation:

- keep conversation progress persistence separate
- keep reference resolution generic and explicit
- keep effect handlers keyed by runtime instruction contracts, not conversation semantics

### Risk: reference resolution becomes fuzzy or surprising

If transposition performs broad world lookup, authored behavior becomes harder to reason about and harder to validate.

Mitigation:

- resolve only from explicit runtime context plus documented reference-expansion rules
- keep current-area-relative room expansion explicit in the contract

### Risk: transposer failure becomes partial or permissive

If the transposer lowers some effects and quietly skips or softens later failures, authored behavior becomes non-deterministic and hard to debug.

Mitigation:

- fail explicitly on unknown effect names, malformed payloads, unresolved required references, and unsupported instruction subsets
- do not emit partial lowered output after a failure

### Risk: tests and harness co-adapt

If the harness, tests, and implementation are created in the same pass, one can quietly shape the others.

Mitigation:

- treat harness work, contract tests, and production implementation as separate behavior slices
- follow fail-first behavior slices per repository norms

## Open Questions / Assumptions

- Assumption: the plan should target the live runtime instruction names in `mutator.js` and `render-dispatch.js`, including `operateDoor` rather than older naming variants.
- Assumption: structural authored-effect validation should be shared between runtime and bundle validation, while full live resolvability checks remain runtime-only where necessary.
- Assumption: the first implementation consumer is conversation-directed speech, but the generic subsystem should not take a conversation-only dependency.
- Open question: which current effect contracts need explicit bundle-validation-time static checks beyond basic structural validation, if any.
- Open question: whether a separate maintainer-facing instruction-contract document should be authored before or alongside implementation to reduce ambiguity around mutator/render instruction field expectations.
