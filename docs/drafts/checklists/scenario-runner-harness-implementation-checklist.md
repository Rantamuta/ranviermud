# Scenario Runner Harness Implementation Checklist

## Status

- Status: active
- Scope: reduce full `npm test` runtime by reusing scenario-runner bootstrap work across low-risk scenario tests
- Source plan: `docs/drafts/ScenarioRunnerHarnessPlan.md`

## Locked Scope

- In Scope:
  - Extract reusable scenario execution logic from `util/scenario-runner.js` into a shared module.
  - Keep `util/scenario-runner.js` as the CLI entry point and preserve its current external behavior.
  - Add an in-process harness for tests that can boot the configured runtime once per file and run multiple scenario assertions against it.
  - Migrate the first low-risk set of scenario-runner tests away from per-test subprocess execution.
  - Keep a small subprocess smoke layer for CLI-help, CLI-error, and representative end-to-end scenario-runner coverage.
  - Preserve explicit cleanup so harness-backed tests remain deterministic.
  - Keep the harness at the `ranviermud` level rather than hardwiring core execution to `bundle-rantamuta`.
- Out of Scope:
  - Changes to engine internals in `Rantamuta/core`.
  - Changes to the public CLI behavior of `util/scenario-runner.js` unless explicitly approved later.
  - Broad optimization of unrelated test files outside the scenario-runner hotspot.
  - Full migration of every authored scenario if cleanup cost outweighs runtime benefit.
  - Deep-clone or snapshot-based world reset systems.
  - General-purpose scenario-platform work beyond what is needed to speed up the current test suite.
- Acceptance Criteria:
  - The refactor preserves the current external behavior of `util/scenario-runner.js` for the retained CLI smoke cases.
  - The first migration slice moves a meaningful set of low-risk scenario assertions off per-test subprocess execution.
  - The migrated tests reuse one booted runtime per file and maintain deterministic isolation through explicit cleanup.
  - The full `npm test` command becomes materially faster in local execution, with the scenario-runner suite providing the primary reduction.
  - Remaining subprocess tests are intentional and limited to cases where CLI realism or cleanup risk still justifies them.

## Checklist

- [x] `C00` [timing] Establish and record baseline timing observations for the full `npm test` command before refactor work begins.
  - Trace:
    - "baseline timing for the full `npm test` command should be recorded before the refactor work begins." (`Validation Strategy`)
    - "baseline timing for the scenario-runner suite may also be recorded to explain where the reduction comes from." (`Validation Strategy`)
  - Validation handoff: `S1`, `non-functional timing evidence`
  - Recorded baseline:
    - `npm test` completed green before refactor work.
    - The `node:test` subprocess-heavy bucket reported `duration_ms 226028.901605` before `tsc`.
    - On this checkout, the full `npm test` command remained in the roughly 4 to 6 minute range end-to-end.

- [ ] `C01` [runner] Extract reusable runtime execution logic from [scenario-runner.js](/mnt/c/workspace/mud/ranviermud/util/scenario-runner.js) into new shared module [scenario-runner-lib.js](/mnt/c/workspace/mud/ranviermud/util/scenario-runner-lib.js) without changing current CLI-visible behavior.
  - Trace:
    - "Extract reusable scenario execution logic from `util/scenario-runner.js` into a shared module." (`In Scope`)
    - "Keep `util/scenario-runner.js` as the CLI entry point and preserve its current external behavior." (`In Scope`)
  - Validation handoff: `S1`, `integration/smoke`

- [ ] `C02` [cli] Refactor [scenario-runner.js](/mnt/c/workspace/mud/ranviermud/util/scenario-runner.js) into a thin CLI wrapper over the shared runner module while preserving help, error, text output, JSON output, and exit-code behavior for retained subprocess smoke coverage.
  - Trace:
    - "Keep `util/scenario-runner.js` as the CLI entry point and preserve its current external behavior." (`In Scope`)
    - "The refactor preserves the current external behavior of `util/scenario-runner.js` for the retained CLI smoke cases." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `integration/smoke`

- [ ] `C03` [harness] Add a harness-backed test helper that boots the configured runtime once per file, creates fresh per-test player/session state, returns a stable scenario result shape, and performs explicit per-run cleanup.
  - Trace:
    - "Add an in-process harness for tests that can boot the configured runtime once per file and run multiple scenario assertions against it." (`In Scope`)
    - "Preserve explicit cleanup so harness-backed tests remain deterministic." (`In Scope`)
    - "The migrated tests reuse one booted runtime per file and maintain deterministic isolation through explicit cleanup." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `behavior-level regression evidence`

- [ ] `C04` [compat] Keep the shared harness repo-level by ensuring baseline scenario execution depends only on the booted configured runtime's playable scenario surface and does not hardwire core execution to `bundle-rantamuta` parser code.
  - Trace:
    - "Keep the harness at the `ranviermud` level rather than hardwiring core execution to `bundle-rantamuta`." (`In Scope`)
    - "Preserve configured bundle loading semantics; the harness must inspect the booted configured runtime rather than inventing a new bundle discovery model." (`Constraints`)
  - Validation handoff: `S2`, `integration/smoke`

- [ ] `C05` [scenarios] Migrate the first low-risk set of scenario assertions in [scenario.basic.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/scenarios/scenario.basic.test.js) from per-test subprocess execution to the harness-backed execution path.
  - Trace:
    - "Migrate the first low-risk set of scenario-runner tests away from per-test subprocess execution." (`In Scope`)
    - "The first migration slice moves a meaningful set of low-risk scenario assertions off per-test subprocess execution." (`Acceptance Criteria`)
    - "Preferred first migrated cases: room look assertions, shorthand canonicalization, simple movement, inventory listing, simple take/put flows, JSON event shape assertions, seed event assertions." (`First Slice`)
  - Validation handoff: `S3`, `behavior-level regression evidence`

- [ ] `C06` [smoke] Retain a small subprocess smoke layer in [scenario.basic.test.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/tests/scenarios/scenario.basic.test.js) for help, CLI-error paths, representative `.scenario` coverage, representative `--json` coverage, and other intentionally process-boundary cases.
  - Trace:
    - "Keep a small subprocess smoke layer for CLI-help, CLI-error, and representative end-to-end scenario-runner coverage." (`In Scope`)
    - "Remaining subprocess tests are intentional and limited to cases where CLI realism or cleanup risk still justifies them." (`Acceptance Criteria`)
    - "Preferred initial subprocess holdouts: `--help`, missing-value error paths, unsupported legacy flag behavior, one `.scenario` file smoke case, one `--json` smoke case..." (`First Slice`)
  - Validation handoff: `S3`, `integration/smoke`

- [ ] `C07` [cleanup] Ensure migrated harness-backed scenario tests do not introduce ordering-sensitive failures by explicitly cleaning up created players, seeded items, and placement state after each run.
  - Trace:
    - "Preserve explicit cleanup so harness-backed tests remain deterministic." (`In Scope`)
    - "The migrated tests reuse one booted runtime per file and maintain deterministic isolation through explicit cleanup." (`Acceptance Criteria`)
    - "reuse runtime only per file, create fresh player/session state per test, and track explicit cleanup of created entities and placements." (`Risks and Mitigations`)
  - Validation handoff: `S4`, `deterministic isolation evidence`

- [ ] `C08` [timing] Record post-change timing observations for the full `npm test` command after the first migration slice and compare them against the baseline in the implementation summary.
  - Trace:
    - "the full `npm test` command should be measured again after the first migration slice." (`Validation Strategy`)
    - "the implementation summary should compare the post-change full-suite timing against the baseline and may include scenario-suite timing as supporting evidence." (`Validation Strategy`)
    - "The full `npm test` command becomes materially faster in local execution, with the scenario-runner suite providing the primary reduction." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `non-functional timing evidence`

- [x] `C09` [docs] Update the task artifacts to reflect implementation-ready execution state as required by the working-artifact lifecycle policy once implementation begins.
  - Trace:
    - "Status: planning" (`Status`)
  - Validation handoff: `S5`, `contract/parity`

- [ ] `C10` [docs] Update the task artifacts to `Status: archived` and move the completed checklist under `docs/archive/**` when the implementation workstream is complete.
  - Trace:
    - "when the task is complete and the related working artifacts are archived, the plan MUST be updated to `Status: archived` and moved to `docs/archive/**`" ([plan.md](/mnt/c/workspace/mud/ranviermud/docs/normative/plan.md#L65))
  - Validation handoff: `S5`, `contract/parity`

## Behavior Slices

- `S1`
  - Goal: establish full-suite timing evidence before refactor work begins.
  - Items: `C00`.
  - Type: mechanical

- `S2`
  - Goal: split reusable scenario execution logic from the CLI wrapper without changing current CLI behavior.
  - Items: `C01`, `C02`.
  - Type: behavior

- `S3`
  - Goal: add the shared harness and keep baseline execution repo-level rather than parser-hardwired.
  - Items: `C03`, `C04`.
  - Type: behavior

- `S4`
  - Goal: migrate the first low-risk scenario assertions while retaining a deliberate subprocess smoke layer.
  - Items: `C05`, `C06`.
  - Type: behavior

- `S5`
  - Goal: prove harness-backed scenario tests remain deterministic and that full-suite runtime improves.
  - Items: `C07`, `C08`.
  - Type: behavior

- `S6`
  - Goal: keep task artifacts aligned with the working-artifact lifecycle before, during, and after execution.
  - Items: `C09`, `C10`.
  - Type: mechanical
