# Verb-local syntax CLI implementation checklist

## Status

- Status: completed
- Scope: standalone verb-local syntax matching prototype CLI (exploratory, not runtime-integrated)
- Source plan: assistant-authored plan in task discussion
- In Scope:
  - Build a standalone CLI that accepts a player input string and always prints pretty JSON output.
  - Include chosen rule in output by default.
  - Implement verb-local syntax compilation/matching and entity-bearing slot resolution in the CLI harness.
  - Include full diegetic verb/rule set from the planning appendix.
  - Include fake deterministic scopes/entities including at least one `LIVING` target.
- Out of Scope:
  - No integration with production parse/dispatch flow.
  - No replacement of current runtime entity resolution pipeline.
  - No fixture-selection flag support.
  - No governance-contract rewrites as part of this checklist.
- Acceptance Criteria:
  - CLI run with one input yields deterministic pretty JSON.
  - Output includes resolved verb, selected rule, and outcome (`success`/`ambiguous`/`nonViable`).
  - Appendix verb set is represented and executable in the harness.
  - Ambiguity/missing/unique behaviors are visible through structured output.
  - No production runtime wiring is changed.

## Checklist

- [x] `C01` [cli-entry] Create a standalone CLI entrypoint that accepts one player input argument and emits pretty JSON output by default.
  - Trace:
    - "Build an isolated CLI harness that executes the proposed model against fake world data."
- [x] `C02` [rules] Define the verb registry with ordered syntax strings for all planned diegetic verbs (`close`, `go`, `inventory`, `lock`, `look`, `open`, `pull`, `push`, `put`, `say`, `take`, `unlock`).
  - Trace:
    - "Supports the full planned verb surface/rules from the planning doc."
- [x] `C03` [compiler] Implement syntax-string compilation for literals and slot atoms (`TEXT`, `WORD`, `NUMBER`, `ENTITY`, `LIVING`, `EXIT`, `(empty)`).
  - Trace:
    - "Implement syntax-string compilation and ordered rule matching."
- [x] `C04` [matcher] Implement declaration-order rule evaluation with recursive backtracking and full post-verb token consumption.
  - Trace:
    - "Rule selection follows declaration order."
- [x] `C05` [resolver] Add fake deterministic scope/entity resolver for `ENTITY`, `LIVING`, and `EXIT`, including missing/ambiguous/unique outcomes.
  - Trace:
    - "Include fake scopes/entities including an NPC/`LIVING`."
- [x] `C06` [artifact] Emit structured output artifacts with stable schema: verb, selected rule, captures, slot-role mapping, token spans, candidate ordering, and outcome details.
  - Trace:
    - "Always show the rule that was chosen."
- [x] `C07` [fixtures] Add default fake world fixture data in-module (no CLI fixture selector), with entities intentionally supporting ambiguity scenarios.
  - Trace:
    - "Include fake entities and NPC."
- [x] `C08` [docs] Add concise usage documentation for the CLI (single-input invocation, output meanings, and explicit note that this is prototype tooling not production wiring).
  - Trace:
    - "Governance-safe exploratory tooling."
- [x] `C09` [safety-boundary] Verify no production parser/dispatch codepaths are modified or imported by the harness in a way that changes runtime behavior.
  - Trace:
    - "CLI-only prototype; no runtime integration."

## Behavior Slices

- `S1`
  - Goal: establish CLI execution surface and verb/rule declarations.
  - Items: `C01`, `C02`.
  - Type: behavior
- `S2`
  - Goal: compile syntax rules and perform deterministic declaration-order matching.
  - Items: `C03`, `C04`.
  - Type: behavior
- `S3`
  - Goal: resolve entity-bearing slots against fake deterministic scopes and emit full artifacts.
  - Items: `C05`, `C06`, `C07`.
  - Type: behavior
- `S4`
  - Goal: document and enforce prototype boundary to avoid runtime behavior drift.
  - Items: `C08`, `C09`.
  - Type: mechanical
