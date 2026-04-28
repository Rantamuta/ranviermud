# Metadata Instruction Targeting Validation Test Checklist

## Status

- Status: planning
- Scope: claim-level test coverage checklist for metadata-instruction targeting validation
- Binding: no (companion validation artifact)
- Source plan: `docs/plans/MetadataInstructionTargetingValidationPlan.md`
- Source checklist: `docs/plans/MetadataInstructionTargetingValidationChecklist.md`

## Purpose

This document answers a narrower question than the implementation checklist:

- which metadata-targeting claims already have direct automated coverage
- which claims still need explicit tests

It does not replace the implementation checklist, and it is intentionally not authored under `docs/normative/checklist.md`.

## Coverage Legend

- `[x]` direct automated coverage exists for the specific claim
- `[ ]` direct claim-level coverage is missing and should be added

## Validator Claims

- [x] `T01` `setPlayerMetadata` accepts implicit current-player targeting.
  - Evidence: broad valid-payload coverage in [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:53)

- [x] `T02` `setPlayerMetadata` accepts explicit `player` targeting.
  - Evidence: explicit metadata-targeting coverage in [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:225)

- [x] `T03` `setRoomMetadata` and `deleteRoomMetadata` accept implicit actor-context targeting.
  - Evidence: broad valid-payload coverage in [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:53)

- [x] `T04` `setRoomMetadata` and `deleteRoomMetadata` accept explicit `actor` and explicit `roomRef` where currently supported.
  - Evidence: explicit metadata-targeting coverage in [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:225)

- [x] `T05` `setRoomMetadata` and `deleteRoomMetadata` reject `player`.
  - Gap: no current validator test exercises supported-shape-but-unsupported `player` targeting for room metadata ops

- [x] `T06` `setAreaMetadata` and `deleteAreaMetadata` accept implicit actor-context targeting.
  - Evidence: broad valid-payload coverage in [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:53)

- [x] `T07` `setAreaMetadata` and `deleteAreaMetadata` accept explicit `actor`.
  - Evidence: explicit metadata-targeting coverage in [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:225)

- [x] `T08` `setAreaMetadata` and `deleteAreaMetadata` reject `player`.
  - Gap: no current validator test exercises unsupported `player` targeting for area metadata ops

- [x] `T09` `setAreaMetadata` and `deleteAreaMetadata` reject `roomRef`.
  - Gap: no current validator test exercises unsupported `roomRef` targeting for area metadata ops

- [x] `T10` `setWorldMetadata` and `deleteWorldMetadata` accept their implicit no-targeting forms.
  - Evidence: broad valid-payload coverage in [authored.instructions.validation.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.validation.test.js:53)

- [x] `T11` `setWorldMetadata` and `deleteWorldMetadata` reject `actor`.
  - Gap: no current validator test exercises unsupported `actor` targeting for world metadata ops

- [ ] `T12` `setWorldMetadata` and `deleteWorldMetadata` reject `player`.
  - Gap: no current validator test exercises unsupported `player` targeting for world metadata ops

- [ ] `T13` `setWorldMetadata` and `deleteWorldMetadata` reject `roomRef`.
  - Gap: no current validator test exercises unsupported `roomRef` targeting for world metadata ops

- [ ] `T14` unsupported metadata targeting fails with one deterministic, explicit finding path rather than only via incidental structural failure.
  - Gap: current metadata validator coverage only exercises malformed optional fields, not unsupported-but-well-formed targeting fields

## Transposer Claims

- [x] `T15` `transposeAuthoredInstructions(...)` lowers `setPlayerMetadata` with implicit current player.
  - Evidence: [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:737)

- [ ] `T16` `transposeAuthoredInstructions(...)` lowers `setPlayerMetadata` with explicit `player`.
  - Gap: no current transposer test covers explicit `player` override for `setPlayerMetadata`

- [x] `T17` `transposeAuthoredInstructions(...)` lowers `setRoomMetadata` with implicit current room.
  - Evidence: [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:765)

- [ ] `T18` `transposeAuthoredInstructions(...)` lowers `setRoomMetadata` with explicit `actor`.
  - Gap: no current transposer test covers explicit `actor` override for room metadata set

- [x] `T19` `transposeAuthoredInstructions(...)` lowers `setRoomMetadata` with explicit `roomRef`.
  - Evidence: [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:793)

- [x] `T20` `transposeAuthoredInstructions(...)` lowers `setAreaMetadata` with implicit current area.
  - Evidence: [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:822)

- [ ] `T21` `transposeAuthoredInstructions(...)` lowers `setAreaMetadata` with explicit `actor`.
  - Gap: no current transposer test covers explicit `actor` override for area metadata set

- [x] `T22` `transposeAuthoredInstructions(...)` lowers `setWorldMetadata` with no targeting fields.
  - Evidence: [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:850)

- [x] `T23` `transposeAuthoredInstructions(...)` lowers implicit room/area/world metadata delete ops and preserves `force`.
  - Evidence: [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:875)

- [ ] `T24` `transposeAuthoredInstructions(...)` lowers `deleteRoomMetadata` with explicit `actor`.
  - Gap: no current transposer test covers explicit `actor` override for room metadata delete

- [ ] `T25` `transposeAuthoredInstructions(...)` lowers `deleteRoomMetadata` with explicit `roomRef`.
  - Gap: no current transposer test covers explicit `roomRef` override for room metadata delete

- [ ] `T26` `transposeAuthoredInstructions(...)` lowers `deleteAreaMetadata` with explicit `actor`.
  - Gap: no current transposer test covers explicit `actor` override for area metadata delete

- [ ] `T27` unsupported metadata targeting returns `AUTHORED_INSTRUCTIONS_INVALID`.
  - Gap: the transposer has generic invalid-input coverage at [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:77), but no metadata-specific unsupported-targeting case

- [ ] `T28` unsupported metadata targeting emits no `operations` or `renderMessages`.
  - Gap: the transposer has generic no-partial-output coverage at [authored.instructions.transposer.test.js](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/authored.instructions.transposer.test.js:1336), but no metadata-specific unsupported-targeting case

## Non-Executable Remainder

- [ ] `M01` Review metadata-targeting wording in [DesignerManual.md](/home/rendall/mud/ranviermud/docs/manuals/DesignerManual.md:1675), [BundleRantamutaTechnicalManual.md](/home/rendall/mud/ranviermud/docs/manuals/BundleRantamutaTechnicalManual.md:696), and [ConversationDSL.md](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md:307).
  - Note: this is intentionally not an automated test claim; it remains a manual documentation-alignment check
