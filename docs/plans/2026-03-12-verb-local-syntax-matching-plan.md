# Verb-Local Syntax Matching Implementation Plan (Incremental)

## Status

- Status: draft
- Scope: bundle-layer command parsing and rule selection
- Binding: no (planning artifact)

## Goal

Introduce an incremental, reversible verb-local syntax matching path that improves free-text verbs such as `say` while preserving compatibility for existing commands.

## Intent

When a player enters a command, the parser should stop guessing structure globally for verbs that opt in. Instead, each participating verb should declare accepted syntax patterns. This should keep natural speech text literal by default and only treat connector words as structure when the verb says so.

## In Scope

- Add an optional syntax-rule declaration surface for verbs.
- Reuse existing verb rule categories (for example intransitive/direct/indirect forms) as the migration entry point.
- Add a syntax-matching phase before entity resolution for opted-in verbs.
- Pilot with `say` only.
- Define slot taxonomy posture:
  - retain `ENTITY` as the broad compatibility slot,
  - support future narrower slots such as `LIVING` and `ITEM`.
- Preserve resolver ownership for binding entity-bearing slots from the matched syntax rule.
- Add focused tests for `say` literal vs addressed behavior.

## Out of Scope

- Replacing global parser behavior for all verbs in one change.
- Changes to engine internals under `Rantamuta/core`.
- CLI/config/boot/load-order/tick compatibility contract changes.
- Broad refactors unrelated to syntax matching pilot behavior.

## Constraints

- Runtime/content boundary in `bundles/bundle-rantamuta` must remain intact.
- Migration must be incremental and reversible.
- Only parsing/pattern-matching surfaces may change in this effort; command phases and mutation/resolution policies are explicitly preserved.
- Phase model reference remains `Receive Input (parse included) -> Entity Resolution -> Capture/Veto -> Plan -> React -> Commit -> Render/Dispatch` per `docs/normative/CommandArchitecture.md`.
- Any user-visible compatibility-impacting behavior change needs explicit approval and follow-up records (`docs/normative/**`, `CHANGELOG.md`, ADR if applicable).

## Implementation Surfaces

Expected owning surfaces (final list to confirm during checklist authoring):

- Bundle command parsing/dispatch path where verb and syntax are selected.
- Verb metadata definition/loading path for syntax declarations.
- Entity resolution handoff artifact from syntax match stage (without changing resolver ownership/policy).
- `say` command behavior and associated tests.
- Documentation touchpoints for migration notes and compatibility rationale.

## Matching Engine Detail (Plan-Level)

The implementation should provide a generic matcher, not a `say`-special parser.

1. **Rule schema and loader**
   - Add ordered rule declarations per verb with atomized patterns (`LITERAL`, `SLOT`).
   - Support extensible slot kinds (`TEXT`, `WORD`, `NUMBER`, `ENTITY`, `LIVING`, `ITEM`, `MULTI_ENTITY`, `MULTI_LIVING`) and compatibility mapping to LIMA-style tokens (`STR`, `WRD`, `OBJ`, `LIV`, `OBS`, `LVS`).
2. **Deterministic matcher**
   - Match rule list in declaration order using recursive backtracking with a fast literal pre-check (LIMA-style flow).
   - Enforce full-pattern consumption semantics and deterministic behavior for identical input/state.
3. **`TEXT` capture semantics**
   - Preserve quoted and unquoted text as opaque `TEXT` capture spans.
   - Use one-or-more-token span search with backtracking to satisfy later literals; never reinterpret internals.
4. **Syntax artifact contract**
   - Emit stable rule id, slot captures, and compatibility aliases for existing parse span names.
5. **Resolver integration**
   - Bind only entity-bearing slots in Entity Resolution.
   - Preserve non-entity slots verbatim for planner/render phases.
6. **Validation and guardrails**
   - Add rule-order/ambiguity characterization tests.
   - Add matcher tests that prove generic behavior across non-`say`-specific patterns, including literal-order shape differences (for example `... with ... for ...` vs `... for ... with ...`).

## Risks and Mitigations

- Risk: Mixed parser model introduces ambiguity while only some verbs opt in.
  - Mitigation: Per-verb opt-in gate; default non-opt-in verbs to current parser path.
- Risk: Addressed `say` edge cases regress to over-reading text.
  - Mitigation: Characterization tests for literal speech, connector-heavy text, and trailing `to ...` forms.
- Risk: Prematurely narrowing target class breaks existing behavior.
  - Mitigation: Start with `TEXT to ENTITY`; keep `LIVING` optional until evidence supports tightening.

## Open Questions / Assumptions

- Unresolved entity in `TEXT to <target>` falls back to literal text (no hard failure in the parser layer).
- Quoted spans are preserved as opaque `TEXT` placeholders; syntax matching does not split or reinterpret quoted internals.
- Use existing parse artifact names initially (for compatibility), then evaluate a rename only if migration evidence justifies it.
- Slot naming uses `LIVING`, defined as NPC + PC actor targets.

## Acceptance Criteria

1. Verb-local syntax matching can be enabled per verb without changing behavior for non-participating verbs.
2. `say` migrates to verb-local syntax matching for both plain speech (`TEXT`) and addressed speech (`TEXT to ENTITY`) in the pilot.
3. Literal speech containing connector words remains literal unless a declared syntax rule matches.
4. Entity resolution binds only entity-bearing slots declared by the selected syntax rule.
5. Slot taxonomy preserves `ENTITY` and supports future narrower slots (including `LIVING` and `ITEM`) without forcing immediate behavior narrowing.
6. Tests cover the motivating `say` examples and fallback/error semantics selected for the pilot.
7. Existing phase ordering and mutation policy are unchanged (`Receive Input (parse included) -> Entity Resolution -> Capture/Veto -> Plan -> React -> Commit -> Render/Dispatch`; no mutation outside Commit).

## Validation Strategy

Required evidence for implementation phase:

- Unit/behavior tests for syntax matching and resolver handoff.
- Integration/smoke validation for command dispatch with `say`.
- Repository-required validation commands for behavior changes:
  - `npm test`
  - `npm run ci:local`

Pass: pilot behavior matches approved acceptance criteria, with no regressions in non-opt-in verbs.

Fail: parser behavior drifts for non-opt-in verbs, or `say` literal/addressed semantics fail tests.
