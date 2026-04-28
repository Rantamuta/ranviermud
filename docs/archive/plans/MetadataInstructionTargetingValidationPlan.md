# Metadata Instruction Targeting Validation Plan

## Status

- Status: archived
- Scope: align authored metadata-instruction targeting validation with the live lowering contract in `bundle-rantamuta`
- Binding: no (working plan)

## Goal

Make authored metadata instructions fail honestly when they declare targeting fields the runtime does not actually honor.

## Intent

In plain language, this change should stop telling designers that a metadata instruction can target something it cannot really target.

Today, some metadata instructions pass validation with fields like `player`, `actor`, or `roomRef`, but the lowering path either ignores those fields or only understands a narrower subset. That is misleading because authored content can look valid, pass bundle validation, and then either behave differently than the author intended or silently ignore part of the payload.

Success means:

- each metadata instruction accepts only the targeting fields its lowering path really supports
- unsupported targeting fields fail during shared authored-instructions validation
- transposition does not gain new hidden targeting behavior just to preserve misleading input
- tests and docs describe one honest targeting contract

## In Scope

- Tighten authored-instructions validation for metadata ops so accepted targeting fields match the current lowerers.
- Preserve `setPlayerMetadata` targeting behavior as the only metadata set op that accepts `player`.
- Reject `player` targeting on:
  - `setRoomMetadata`
  - `setAreaMetadata`
  - `setWorldMetadata`
  - `deleteRoomMetadata`
  - `deleteAreaMetadata`
  - `deleteWorldMetadata`
- Reject other unsupported targeting spillover introduced by the shared validator helper, specifically:
  - `roomRef` on area metadata ops
  - `actor`, `player`, and `roomRef` on world metadata ops
- Keep the runtime lowerers as the behavioral authority for what is currently supported.
- Add validator tests that prove supported targeting still passes and unsupported targeting now fails deterministically.
- Add at least one transposer-level regression test proving unsupported targeting is rejected before lowering.
- Update non-normative docs where needed so manuals and planning docs do not imply broader metadata targeting support than the runtime actually provides.

## Out of Scope

- Adding new metadata-targeting features such as mapping `player` onto `actor` for room/area metadata.
- Changing metadata mutator semantics.
- Changing gameplay behavior for already-supported metadata writes and deletes.
- Broad redesign of the authored-instructions validator architecture.
- Engine-internal changes outside `bundle-rantamuta`.

## Acceptance Criteria

- `setPlayerMetadata` continues to accept implicit current-player targeting and explicit `player` targeting.
- `setRoomMetadata` and `deleteRoomMetadata` accept only:
  - implicit actor-context targeting
  - explicit `actor`
  - explicit `roomRef`
- `setRoomMetadata` and `deleteRoomMetadata` reject `player` when provided.
- `setAreaMetadata` and `deleteAreaMetadata` accept only:
  - implicit actor-context targeting
  - explicit `actor`
- `setAreaMetadata` and `deleteAreaMetadata` reject `player` and `roomRef` when provided.
- `setWorldMetadata` and `deleteWorldMetadata` reject `actor`, `player`, and `roomRef` when provided.
- Shared authored-instructions validation reports unsupported targeting deterministically rather than silently accepting it.
- `transposeAuthoredInstructions(...)` fails with `AUTHORED_INSTRUCTIONS_INVALID` for metadata instructions that use unsupported targeting fields, and does not emit partial lowered output.
- Existing supported metadata targeting cases still pass validation and still lower to the same canonical runtime operations.
- Docs that describe metadata targeting no longer imply support for fields the runtime ignores.

## Constraints

- Preserve the existing runtime/content boundary from [`AGENTS.md`](/home/rendall/mud/ranviermud/AGENTS.md); this is runtime-layer validation work, not area-content work.
- Do not broaden the transposer to invent new metadata-targeting semantics just to preserve currently misleading payloads.
- Keep validation deterministic and structural:
  - supported fields pass
  - unsupported fields fail
  - malformed supported fields still fail with the existing structural rules
- Keep the lowerers in [`transposer.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js) as the authority for the live targeting contract unless this plan is explicitly revised.
- If a new validation error code is introduced for unsupported fields, it must be used consistently across metadata ops rather than as one-off wording per instruction.

## Implementation Surfaces

- Shared metadata validator helpers in [`bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js)
  - current shared metadata-set helper: [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:407)
  - current shared metadata-delete helper: [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:427)
  - validator registration map for metadata ops: [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:585)
- Live lowering contract in [`bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js)
  - metadata actor/room targeting resolution authority: [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:261)
  - `setPlayerMetadata`: [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:452)
  - `setRoomMetadata`: [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:474)
  - `setAreaMetadata`: [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:490)
  - `setWorldMetadata`: [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:506)
  - `deleteRoomMetadata`: [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:516)
  - `deleteAreaMetadata`: [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:532)
  - `deleteWorldMetadata`: [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:548)
- Validator regression coverage in [`bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js)
  - supported metadata targeting slice: [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:225)
  - malformed targeting slice: [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:242)
  - metadata delete targeting slice: [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:275)
- Transposer regression coverage in [`bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js)
  - metadata lowering slice: [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:736)
  - invalid-authored-input failure pattern: [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:77)
- Non-normative docs that may need wording alignment:
  - [DesignerManual.md](/home/rendall/mud/ranviermud/docs/manuals/DesignerManual.md:1675)
  - [BundleRantamutaTechnicalManual.md](/home/rendall/mud/ranviermud/docs/manuals/BundleRantamutaTechnicalManual.md:696)
  - [ConversationDSL.md](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md:307)

## Validation Strategy

This plan changes validation behavior and the authored contract for supported metadata-targeting fields, so it requires explicit evidence.

### Unit / Contract

Add focused validator coverage for the supported-targeting matrix and the unsupported-targeting matrix.

Pass means:

- supported metadata-targeting combinations are accepted
- unsupported metadata-targeting fields are rejected deterministically
- malformed supported fields still fail with the expected structural findings

Fail means:

- validation still accepts targeting fields the lowerers ignore
- supported targeting combinations regress
- unsupported-field failures depend on execution order or unrelated payload shape

### Integration / Transposition

Add at least one transposer-level regression proving unsupported targeting is rejected before lowering.

Pass means:

- `transposeAuthoredInstructions(...)` returns `AUTHORED_INSTRUCTIONS_INVALID` for unsupported metadata-targeting fields
- no operations or render messages are emitted for that invalid input

Fail means:

- invalid targeting survives into lowering
- transposition silently ignores unsupported targeting and still returns success

### Repository Validation

Implementation from this plan is behavior-changing work.

For the bundle implementation, run:

- `npm test` in `bundles/bundle-rantamuta`

If the wrapper repo updates its submodule pointer or any wrapper-side docs/contracts in the same delivery path, final wrapper validation must also satisfy:

- `npm test`
- `npm run ci:local`

## Risks and Mitigations

### Risk: accidental contract tightening beyond the intended matrix

Because the current validator shares one helper across several metadata ops, a careless refactor could reject fields that are still genuinely supported.

Mitigation:

- define the allowed-targeting matrix explicitly in tests before or alongside implementation
- keep acceptance criteria phrased per instruction family rather than as one generic helper rule

### Risk: preserving hidden behavior by mistake

If the implementation validates field shape but still leaves unsupported fields accepted, the mismatch will remain.

Mitigation:

- reject unsupported fields explicitly, not just malformed values
- add one transposer-level invalid-input test so successful lowering cannot hide validator drift

### Risk: docs continue to overstate or understate support

If docs are left untouched, contributors may keep authoring against stale assumptions.

Mitigation:

- review manuals and planning docs that mention metadata targeting in the same change
- keep wording tied to the live accepted-targeting matrix

## Open Questions / Assumptions

- Assumption: `roomRef` on area metadata ops should be rejected, even though the current shared validator helper incidentally allows it, because the designer and technical docs describe area metadata as actor-context targeting rather than room-target override.
- Assumption: world metadata ops should reject all targeting fields (`actor`, `player`, `roomRef`) rather than silently ignoring them.
- If maintainers want the smallest possible patch limited only to rejecting `player` on room/area/world metadata ops, this plan should be revised before checklist authoring so the narrower matrix is explicit.

## Compatibility and Records

- Affected compatibility boundary: the authored-instructions metadata-targeting contract in `bundle-rantamuta`.
- Normative update expectation: none by default, because no `docs/normative/**` contract currently owns this specific metadata-targeting matrix. If maintainers decide a normative authored-instructions or conversation contract should own it, that update should happen in the same change set.
- `CHANGELOG.md` expectation in this wrapper repo: none by default, because this is not expected to change wrapper boot/runtime/CI behavior or player-facing behavior directly. If maintainers want downstream bundle authors warned that previously accepted ignored fields now fail validation, record that in the implementation PR description and reassess whether a wrapper changelog note is warranted when the submodule update lands.

## Conformance QC

### Intent clarity issues

- None currently; the plan states the plain-language problem as "validation accepts targeting the runtime does not honor."

### Missing required sections

- None.

### Ambiguities / assumptions to resolve

- Whether `roomRef` on area metadata ops should be treated as unsupported contract spillover or preserved as live behavior.
- Whether unsupported-field rejection should use a dedicated validation code or reuse existing field-required/boolean-required patterns.

### Validation strategy gaps

- None if implementation adds both validator-level and transposer-level rejection coverage.

### Traceability readiness

- Ready: the plan maps the plain-language contract directly to validator helpers, lowering authority in `transposer.js`, concrete test slices, and specific docs that may require alignment.

### Pass/Fail: ready for checklist authoring

- Pass, assuming the explicit assumptions above are accepted or revised during review.
