# Verb-Local Syntax Matching Implementation Checklist

## Status

- Status: archived
- Scope: implement verb-local syntax matching for bundle-layer diegetic commands in `bundles/bundle-rantamuta`
- Source plan: `docs/archive/VerbLocalSyntaxMatchingPlan.md`
- In Scope:
  - replace global relation-word structural inference with verb-local ordered syntax matching
  - keep `Receive Input` limited to canonicalization, tokenization or lexing, source-span preservation, and exact verb resolution
  - add linked `Parsing and Entity Resolution` behavior that matches ordered syntax rules, resolves entity-bearing slots during matching, and emits interpretation or ambiguity artifacts
  - convert all bundle-layer diegetic verbs to verb-local syntax matching and remove the legacy parser afterward
  - preserve downstream phase responsibilities and existing actor/direct/indirect hook surfaces
- Out of Scope:
  - changing Capture, Plan, React, Commit, or Render responsibilities beyond consuming the new artifacts
  - changing current `canActor`, `canDirect`, `canIndirect`, `planActor`, `planDirect`, `planIndirect`, or `reactions` semantics
  - engine-internal work under `Rantamuta/core`
  - CLI, config, boot, load-order, or tick compatibility changes
- Acceptance Criteria:
  - verbs declare ordered compact syntax strings and declaration order is the only rule-priority mechanism
  - `Receive Input` performs no structural interpretation beyond verb identification
  - Parsing and Entity Resolution matches rules and entity-bearing slots together with deterministic success and ambiguity artifacts
  - all remaining bundle-layer diegetic verbs are migrated and no bundle-layer diegetic verb remains on the legacy parser model
  - the legacy parser is removed after conversion is complete
- Locked Context:
  - normative alignment already exists in `docs/normative/CommandArchitecture.md` and `docs/normative/EntityResolution.md`
  - architecture rationale already exists in `docs/drafts/adr/ADR-0003-verb-local-syntax-matching.md`

## Checklist

- [x] `C01` [intake] Keep `Receive Input` in [parse-input.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/parse-input.js) limited to canonicalization, tokenization or lexing, source-span preservation, and exact verb-key resolution by removing global structural inference from that surface.
  - Trace:
    - "Keep `Receive Input` limited to canonicalizing raw input, tokenizing or lexing input, and resolving the verb key." (`In Scope`)
    - "`Receive Input` does not perform structural interpretation beyond identifying the verb." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `contract/parity`

- [x] `C02` [matcher] Implement syntax-string compilation in a bundle-layer matcher support module under [lib/session](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session) for literals, `(empty)`, and slot kinds `TEXT`, `WORD`, `NUMBER`, `ENTITY`, `LIVING`, and `EXIT`.
  - Trace:
    - "Declare verb-local syntax rules as ordered compact space-separated syntax strings compiled at load time into internal matcher patterns." (`In Scope`)
    - "Support the initial slot kinds `TEXT`, `WORD`, `NUMBER`, `ENTITY`, `LIVING`, and `EXIT`." (`In Scope`)
    - "Support `(empty)` as author shorthand for a zero-atom rule." (`In Scope`)
  - Validation handoff: `S1`, `unit`

- [x] `C03` [declaration] Add ordered `syntaxRules` declaration support for bundle commands and wire load-time compilation of those rules into the bundle-layer command loading path (depends on `C02`).
  - Trace:
    - "Declare verb-local syntax rules as ordered compact space-separated syntax strings compiled at load time into internal matcher patterns." (`In Scope`)
    - "Verbs declare ordered syntax rules as compact space-separated syntax strings." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`

- [x] `C04` [matcher] Implement recursive declaration-order rule evaluation in bundle-layer matcher support so variable-width slots use greedy longest-to-shortest capture with backtracking and no hidden weighting or global relation-word inference (depends on `C02`).
  - Trace:
    - "Use recursive backtracking for rule matching, including greedy variable-width capture with backtracking to satisfy later literals or entity slots." (`In Scope`)
    - "Rule declaration order is the only rule-priority mechanism." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `unit`

- [x] `C05` [resolution] Rework [entity-resolution.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/entity-resolution.js) and [entity-resolution-helper.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/helpers/entity-resolution-helper.js) so `ENTITY`, `LIVING`, and `EXIT` slot viability is evaluated during matching with tri-state `resolved` / `missing` / `ambiguous` outcomes (depends on `C02`, `C04`).
  - Trace:
    - "interprets entity-bearing slots as part of rule viability" (`In Scope`)
    - "distinguishes uniquely resolved, missing, and ambiguous entity-bearing results" (`In Scope`)
    - "The linked `Parsing and Entity Resolution` step matches syntax rules and evaluates entity-bearing slots together." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `unit`

- [x] `C06` [artifact] Assemble a stable success interpretation artifact in the matcher or resolution support modules that carries the resolved verb, matched syntax rule, compiled-rule identifier, captured slot values, token ranges, downstream slot-role mapping, and resolved entity references where applicable (depends on `C04`, `C05`).
  - Trace:
    - "Produce an interpretation artifact that carries the resolved verb, matched syntax rule, captured slot values, token ranges, downstream slot-role mapping, and resolved entity references where applicable." (`In Scope`)
    - "The interpretation artifact is produced deterministically and contains the resolved verb, matched syntax rule, captured slot values, token ranges, slot-role mapping, and resolved entity references where applicable." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `contract/parity`

- [x] `C07` [artifact] Assemble a structured ambiguity artifact with per-slot ambiguity entries, token ranges, slot roles, and deterministic candidate ordering while keeping player-facing clarification text out of resolver output (depends on `C04`, `C05`).
  - Trace:
    - "Preserve deterministic ambiguity handling so dispatch can assemble combined clarification messages without resolver-owned output." (`In Scope`)
    - "Entity-bearing ambiguity produces a deterministic ambiguity artifact with per-slot candidate sets and deterministic candidate ordering." (`Acceptance Criteria`)
    - "Dispatch can assemble combined clarification text from ambiguity artifacts without resolver-owned output." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `integration/smoke`

- [x] `C08` [dispatch] Update [command-dispatch.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/command-dispatch.js) so the runtime executes the linked `Parsing and Entity Resolution` step before Capture and treats the emitted interpretation or ambiguity artifact as the canonical downstream input (depends on `C01`, `C03`, `C06`, `C07`).
  - Trace:
    - "Add a linked `Parsing and Entity Resolution` interpretation step" (`In Scope`)
    - "Later command phases keep their current responsibilities and consume the finished interpretation artifact." (`Acceptance Criteria`)
  - Validation handoff: `S3`, `integration/smoke`

- [x] `C09` [dispatch] Preserve downstream actor/direct/indirect semantics in [command-dispatch.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/command-dispatch.js) by binding direct and indirect roles from the interpretation artifact instead of re-parsing relation shape later in the pipeline (depends on `C06`, `C08`).
  - Trace:
    - "Update command-architecture documentation to make the interpretation step explicit and keep downstream phase responsibilities unchanged." (`In Scope`)
    - "The artifact must provide enough stable information for downstream phases to preserve current actor/direct/indirect hook behavior." (`Interpretation Artifact`)
  - Validation handoff: `S3`, `contract/parity`

- [x] `C10` [commands] Migrate addressed and free-text command declaration in [say.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/say.js) to ordered verb-local syntax rules with `TEXT to LIVING` before `TEXT` (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "`say` is migrated successfully under the new model with rule order `TEXT to LIVING`, then `TEXT`." (`Acceptance Criteria`)
    - "Move command declarations to verb-local ordered syntax rules, beginning with `bundles/bundle-rantamuta/commands/say.js`" (`Implementation Surfaces`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C11` [commands] Migrate [go.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/go.js) to ordered verb-local syntax rules using the appendix `EXIT` rule shape (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C12` [commands] Migrate [look.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/look.js) to ordered verb-local syntax rules using the appendix `(empty)` and `ENTITY` rule shapes (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C13` [commands] Migrate [inventory.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/inventory.js) to ordered verb-local syntax rules using the appendix `(empty)` rule shape (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C14` [commands] Migrate [open.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/open.js) to ordered verb-local syntax rules using the appendix `ENTITY with ENTITY` and `ENTITY` rule shapes (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C15` [commands] Migrate [close.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/close.js) to ordered verb-local syntax rules using the appendix `ENTITY` rule shape (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C16` [commands] Migrate [pull.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/pull.js) to ordered verb-local syntax rules using the appendix `ENTITY` rule shape (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C17` [commands] Migrate [push.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/push.js) to ordered verb-local syntax rules using the appendix `ENTITY` rule shape (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C18` [commands] Migrate [put.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/put.js) to ordered verb-local syntax rules using the appendix `ENTITY in ENTITY`, `ENTITY on ENTITY`, and `ENTITY` rule shapes (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C19` [commands] Migrate [take.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/take.js) to ordered verb-local syntax rules using the appendix `ENTITY from ENTITY` and `ENTITY` rule shapes (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C20` [commands] Migrate [lock.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/lock.js) to ordered verb-local syntax rules using the appendix `ENTITY with ENTITY` and `ENTITY` rule shapes (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Appendix: Current Diegetic Verbs and Putative Rules" (`Appendix`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C21` [commands] Migrate [unlock.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/commands/unlock.js) to ordered verb-local syntax rules using the appendix `ENTITY with ENTITY` and `ENTITY` rule shapes and preserve structured multi-slot ambiguity behavior (depends on `C03`, `C08`, `C09`).
  - Trace:
    - "Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change." (`In Scope`)
    - "Multi-slot ambiguity cases such as `unlock chest with key` produce structured ambiguity rather than generic failure when structure matches and required entity-bearing slots are ambiguous." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `integration/smoke`

- [x] `C22` [cleanup] Remove the legacy parser path from bundle-layer parsing and dispatch once all diegetic verbs are migrated and the new interpretation path is the only command-shape model in use (depends on `C10` through `C21`).
  - Trace:
    - "Remove the legacy parser once conversion is complete." (`In Scope`)
    - "The legacy parser is removed after conversion is complete." (`Acceptance Criteria`)
  - Validation handoff: `S5`, `contract/parity`

- [x] `C23` [records] Update [CHANGELOG.md](/mnt/c/workspace/mud/ranviermud/CHANGELOG.md) when the runtime implementation lands so the player-visible command interpretation change is recorded per repo policy (depends on `C22`).
  - Trace:
    - "`CHANGELOG.md` update required on runtime implementation: yes, because command interpretation behavior is player-visible and runtime-visible." (`Compatibility and Records`)
  - Validation handoff: `S5`, `contract/parity`

## Behavior Slices

- `S1`
  - Goal: establish the new declaration and intake boundaries for verb-local syntax matching without allowing `Receive Input` to keep doing structural parsing work.
  - Items: `C01`, `C02`, `C03`.
  - Type: behavior

- `S2`
  - Goal: implement the new matcher, in-match entity-bearing slot viability, and deterministic interpretation or ambiguity artifacts.
  - Items: `C04`, `C05`, `C06`, `C07`.
  - Type: behavior

- `S3`
  - Goal: wire the new interpretation artifacts into command dispatch while preserving downstream actor/direct/indirect phase semantics.
  - Items: `C08`, `C09`.
  - Type: behavior

- `S4`
  - Goal: migrate all bundle-layer diegetic command declarations to verb-local syntax rules in the approved command families.
  - Items: `C10`, `C11`, `C12`, `C13`, `C14`, `C15`, `C16`, `C17`, `C18`, `C19`, `C20`, `C21`.
  - Type: behavior

- `S5`
  - Goal: remove the old parser path and record the shipped compatibility change.
  - Items: `C22`, `C23`.
  - Type: behavior
