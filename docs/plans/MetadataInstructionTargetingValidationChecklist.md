# Metadata Instruction Targeting Validation Checklist

## Status

- Status: active
- Scope: implementation checklist for narrowing authored metadata-instruction targeting validation to the live lowering contract in `bundle-rantamuta`
- Source plan: `docs/plans/MetadataInstructionTargetingValidationPlan.md`
- In Scope:
  - tighten metadata-instruction validation so accepted targeting fields match the current lowerers
  - reject `player` targeting on room, area, and world metadata ops
  - reject shared-helper targeting spillover such as `roomRef` on area metadata ops and any targeting fields on world metadata ops
  - keep lowerers as the behavioral authority while adding deterministic validation failures and aligning non-normative docs
- Out of Scope:
  - adding new metadata-targeting features such as mapping `player` onto `actor`
  - changing metadata mutator semantics or other supported gameplay behavior
  - broad redesign of the authored-instructions validator architecture
- Acceptance Criteria:
  - `setPlayerMetadata` still accepts implicit and explicit `player` targeting
  - room metadata ops keep implicit actor-context, explicit `actor`, and explicit `roomRef`, while rejecting `player`
  - area metadata ops keep implicit actor-context and explicit `actor`, while rejecting `player` and `roomRef`
  - world metadata ops reject `actor`, `player`, and `roomRef`
  - unsupported targeting fails deterministically through shared validation, and transposition still fails before emitting lowered output
  - docs no longer imply support for ignored metadata-targeting fields

## Checklist

- [x] `C01` [validator] Replace the one-size-fits-all metadata-targeting allowance in [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:407) and [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:427) with an instruction-specific allowed-targeting matrix that can distinguish player, room, area, and world metadata contracts.
  - Trace:
    - "Tighten authored-instructions validation for metadata ops so accepted targeting fields match the current lowerers." (`In Scope`)
    - "each metadata instruction accepts only the targeting fields its lowering path really supports" (`Intent`)
  - Validation handoff: `S1`, `unit`

- [x] `C02` [validator] Preserve the `setPlayerMetadata` contract in [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:585) so it continues to allow implicit current-player targeting and explicit `player` targeting only.
  - Trace:
    - "Preserve `setPlayerMetadata` targeting behavior as the only metadata set op that accepts `player`." (`In Scope`)
    - "`setPlayerMetadata` continues to accept implicit current-player targeting and explicit `player` targeting." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`

- [x] `C03` [validator] Narrow room metadata validation in [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:588) and [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:597) so `setRoomMetadata` and `deleteRoomMetadata` keep implicit actor-context targeting plus explicit `actor` and `roomRef`, while rejecting `player` (depends on `C01`).
  - Trace:
    - "Reject `player` targeting on: `setRoomMetadata` ... `deleteRoomMetadata`" (`In Scope`)
    - "`setRoomMetadata` and `deleteRoomMetadata` accept only: implicit actor-context targeting; explicit `actor`; explicit `roomRef`" (`Acceptance Criteria`)
    - "`setRoomMetadata` and `deleteRoomMetadata` reject `player` when provided." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`

- [x] `C04` [validator] Narrow area metadata validation in [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:591) and [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:600) so `setAreaMetadata` and `deleteAreaMetadata` keep implicit actor-context targeting and explicit `actor`, while rejecting `player` and `roomRef` (depends on `C01`).
  - Trace:
    - "Reject `player` targeting on: `setAreaMetadata` ... `deleteAreaMetadata`" (`In Scope`)
    - "Reject other unsupported targeting spillover ... specifically: `roomRef` on area metadata ops" (`In Scope`)
    - "`setAreaMetadata` and `deleteAreaMetadata` accept only: implicit actor-context targeting; explicit `actor`" (`Acceptance Criteria`)
    - "`setAreaMetadata` and `deleteAreaMetadata` reject `player` and `roomRef` when provided." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`

- [x] `C05` [validator] Narrow world metadata validation in [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:594) and [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js:603) so `setWorldMetadata` and `deleteWorldMetadata` reject `actor`, `player`, and `roomRef` when provided (depends on `C01`).
  - Trace:
    - "Reject `player` targeting on: `setWorldMetadata` ... `deleteWorldMetadata`" (`In Scope`)
    - "Reject other unsupported targeting spillover ... specifically: `actor`, `player`, and `roomRef` on world metadata ops" (`In Scope`)
    - "`setWorldMetadata` and `deleteWorldMetadata` reject `actor`, `player`, and `roomRef` when provided." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`

- [x] `C06` [validator] Add one deterministic unsupported-targeting failure path in [validator.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js) and use it consistently across metadata ops so unsupported targeting fails explicitly rather than being accepted or ignored indirectly (depends on `C01`, `C03`, `C04`, `C05`).
  - Trace:
    - "Shared authored-instructions validation reports unsupported targeting deterministically rather than silently accepting it." (`Acceptance Criteria`)
    - "unsupported targeting fields fail during shared authored-instructions validation" (`Intent`)
    - "If a new validation error code is introduced for unsupported fields, it must be used consistently across metadata ops rather than as one-off wording per instruction." (`Constraints`)
  - Validation handoff: `S1`, `unit, contract/parity`

- [x] `C07` [transposer] Review the validation gate and metadata-lowering path in [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:298), [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:474), [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:490), [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:506), [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:516), [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:532), and [transposer.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/transposer.js:548); adjust only where needed so unsupported metadata targeting fails through the shared `AUTHORED_INSTRUCTIONS_INVALID` envelope before lowering, without adding new targeting behavior (depends on `C02` through `C06`).
  - Trace:
    - "`transposeAuthoredInstructions(...)` fails with `AUTHORED_INSTRUCTIONS_INVALID` for metadata instructions that use unsupported targeting fields, and does not emit partial lowered output." (`Acceptance Criteria`)
    - "Do not broaden the transposer to invent new metadata-targeting semantics just to preserve currently misleading payloads." (`Constraints`)
    - "Keep the lowerers in `transposer.js` as the authority for the live targeting contract unless this plan is explicitly revised." (`Constraints`)
  - Validation handoff: `S2`, `integration/transposition`

- [ ] `C08` [docs] Align [DesignerManual.md](/home/rendall/mud/ranviermud/docs/manuals/DesignerManual.md:1675), [BundleRantamutaTechnicalManual.md](/home/rendall/mud/ranviermud/docs/manuals/BundleRantamutaTechnicalManual.md:696), and [ConversationDSL.md](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md:307) so they describe only the supported metadata-targeting matrix and do not imply support for ignored fields (depends on `C02` through `C06`).
  - Trace:
    - "Update non-normative docs where needed so manuals and planning docs do not imply broader metadata targeting support than the runtime actually provides." (`In Scope`)
    - "Docs that describe metadata targeting no longer imply support for fields the runtime ignores." (`Acceptance Criteria`)
  - Validation handoff: `S3`, `contract/parity`

## Behavior Slices

- `S1`
  - Goal: replace the shared metadata-targeting spillover with an explicit per-instruction validation matrix.
  - Items: `C01`, `C02`, `C03`, `C04`, `C05`, `C06`.
  - Type: behavior

- `S2`
  - Goal: keep transposition honest by ensuring unsupported metadata targeting fails at the shared validation boundary rather than lowering silently.
  - Items: `C07`.
  - Type: behavior

- `S3`
  - Goal: align designer and planning docs with the narrowed metadata-targeting contract.
  - Items: `C08`.
  - Type: mechanical
