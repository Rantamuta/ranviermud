# Scenario Runner Harness Plan

## Status

- Status: active
- Scope: reduce full `npm test` runtime by reusing scenario-runner bootstrap work across low-risk scenario tests
- Type: implementation plan for review (not yet implemented)
- Source design: `docs/drafts/ScenarioRunnerHarnessDesign.md`

## Goal

Reduce full `npm test` wall-clock time by moving most low-risk scenario-runner assertions away from per-test subprocess bootstrap and onto a shared once-per-file harness, while preserving the existing `util/scenario-runner.js` CLI contract.

## Intent

Running the test suite should spend less time repeatedly starting the same scenario runtime and more time actually checking game behavior.

We want to keep a small number of true CLI smoke tests, but most narrow scenario checks should reuse one booted runtime per file. That should make local feedback faster without changing how the scenario-runner command behaves for users or maintainers.

## In Scope

- Extract reusable scenario execution logic from `util/scenario-runner.js` into a shared module.
- Keep `util/scenario-runner.js` as the CLI entry point and preserve its current external behavior.
- Add a shared harness for tests that can boot the configured runtime once per file and run multiple scenario assertions against it.
- Allow that shared harness to use a long-lived child-process boundary when booting the runtime inside the main test process would leak cross-suite global state.
- Migrate the first low-risk set of scenario-runner tests away from per-test subprocess execution.
- Keep a small subprocess smoke layer for CLI-help, CLI-error, and representative end-to-end scenario-runner coverage.
- Preserve explicit cleanup so harness-backed tests remain deterministic.
- Keep the harness at the `ranviermud` level rather than hardwiring core execution to `bundle-rantamuta`.

## Out of Scope

- Changes to engine internals in `Rantamuta/core`.
- Changes to the public CLI behavior of `util/scenario-runner.js` unless explicitly approved later.
- Broad optimization of unrelated test files outside the scenario-runner suite.
- Full migration of every authored scenario if cleanup cost outweighs runtime benefit.
- Deep-clone or snapshot-based world reset systems.
- General-purpose scenario-platform work beyond what is needed to speed up the current test suite.

## Acceptance Criteria

- The refactor preserves the current external behavior of `util/scenario-runner.js` for the retained CLI smoke cases.
- The first migration slice moves a meaningful set of low-risk scenario assertions off per-test subprocess execution.
- The migrated tests reuse one booted runtime per file and maintain deterministic isolation through explicit cleanup.
- The full `npm test` command becomes materially faster in local execution, with the scenario-runner suite providing the primary reduction.
- Remaining subprocess tests are intentional and limited to cases where CLI realism or cleanup risk still justifies them.

## Constraints

- Preserve deterministic behavior for identical world state and input.
- Preserve configured bundle loading semantics; the harness must inspect the booted configured runtime rather than inventing a new bundle discovery model.
- Preserve the runtime/content boundary in `bundles/bundle-rantamuta`.
- Keep CommonJS and Node 22 compatibility.
- Keep the refactor small, reversible, and test-focused.
- Prefer a long-lived child-process harness over fragile in-process global-state reset when the shared runtime contaminates the main test process.

## Implementation Surfaces

- `util/scenario-runner.js`
  - split CLI responsibilities from reusable runtime execution logic while preserving current command-line behavior.
- `util/scenario-runner-lib.js`
  - new shared module for booting the configured runtime, creating per-run player/session state, executing scenario commands, collecting results, and cleaning up.
- `bundles/bundle-rantamuta/tests/scenarios/scenario.basic.test.js`
  - migrate the low-risk majority of current subprocess scenario tests to the harness-backed execution path.
- new harness-backed test helper, if needed
  - provide per-file boot and per-test run utilities without duplicating setup logic in the scenario test file, whether the shared runtime lives in-process or in a long-lived child process.
- retained subprocess smoke cases in the scenario-runner suite
  - preserve direct CLI coverage for help, error paths, and representative end-to-end behavior.

## First Slice

The first implementation slice should migrate the highest-payoff, lowest-risk tests first.

Interpretation for the first harness slice:

- `C03` defines the test-facing harness contract: once-per-file boot semantics, once-per-test scenario execution, stable result shape, and explicit per-run cleanup requirements.
- `C04` chooses the process boundary for that contract. Given the observed cross-suite contamination from booting Ranvier inside the Mocha process, the preferred implementation path is a long-lived child-process harness rather than broad in-process global-state reset.
- `C05` keeps that boundary repo-level and capability-based so the shared harness does not become hardwired to `bundle-rantamuta` parser code for baseline execution.

Preferred first migrated cases:

- room look assertions,
- shorthand canonicalization,
- simple movement,
- inventory listing,
- simple take/put flows,
- JSON event shape assertions,
- seed event assertions.

Preferred initial subprocess holdouts:

- `--help`,
- missing-value error paths,
- unsupported legacy flag behavior,
- one `.scenario` file smoke case,
- one `--json` smoke case,
- scenarios whose cleanup path is less obvious than their setup path,
- scenarios that intentionally validate process-boundary CLI behavior.

## Risks and Mitigations

- Risk: hidden shared state causes order-dependent failures.
  - Mitigation: reuse runtime only per file, create fresh player/session state per test, and track explicit cleanup of created entities and placements. If an in-process harness leaks process-global state into other suites, move the shared runtime behind a long-lived child-process boundary instead of attempting broad global resets in the Mocha process.
- Risk: the refactor drifts into general harness architecture work and loses the test-speed objective.
  - Mitigation: keep the first slice narrowly focused on the scenario-runner suite and stop once full-suite runtime improvement is good enough.
- Risk: bundle-specific parser assumptions leak into the shared core.
  - Mitigation: keep parse enrichment optional and ensure baseline harness execution depends only on the booted runtime's playable scenario surface.
- Risk: CLI coverage is weakened by over-migration.
  - Mitigation: retain a deliberate subprocess smoke layer for direct CLI behavior.

## Validation Strategy

This plan changes executable test infrastructure and should produce both correctness evidence and runtime-improvement evidence.

Required evidence types:

- integration/smoke
  - retained subprocess smoke cases must continue to prove that `util/scenario-runner.js` still behaves as a CLI entry point.
- behavior-level regression evidence
  - migrated harness-backed tests must continue to assert the same gameplay-facing outcomes they cover today.
- deterministic isolation evidence
  - migrated tests must pass without introducing ordering-sensitive failures within the scenario-runner suite.
- non-functional timing evidence
  - baseline timing for the full `npm test` command should be recorded before the refactor work begins.
  - baseline timing for the scenario-runner suite may also be recorded to explain where the reduction comes from.
  - the full `npm test` command should be measured again after the first migration slice.
  - the implementation summary should compare the post-change full-suite timing against the baseline and may include scenario-suite timing as supporting evidence.

Pass/fail in plain language:

- pass if the migrated tests preserve their current behavior coverage, retained subprocess smoke tests still validate the CLI path, and the full `npm test` command is materially faster when compared against a recorded baseline.
- fail if CLI behavior changes unintentionally, migrated tests become flaky or order-sensitive, or the refactor adds complexity without a noticeable runtime improvement.

Implementation validation requirements:

- because this is executable-code work, implementation should run `npm test`.
- because repository policy requires local CI parity for behavior-changing work, implementation should also run `npm run ci:local`.

## Open Questions / Assumptions

- Assumption: once-per-file runtime reuse is the best initial reuse boundary; broader reuse is not needed for the first slice.
- Assumption: the first meaningful speedup will come from `bundles/bundle-rantamuta/tests/scenarios/scenario.basic.test.js`.
- Open question: which currently slow authored scenarios are worth keeping subprocess-based permanently because cleanup risk outweighs runtime benefit?
- Open question: after the first slice, how much direct CLI subprocess coverage is still enough?
