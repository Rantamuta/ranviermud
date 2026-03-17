# Scenario Runner Harness Design

## Status

- Status: planning
- Scope: speed up `npm test` by reducing repeated scenario-runner bootstrap cost
- Type: design note for review

## Goal

Reduce `npm test` wall-clock time by removing most repeated full-engine bootstrap work from scenario-runner tests, while preserving confidence in command-path behavior and keeping the existing `util/scenario-runner.js` CLI contract intact.

## Problem Statement

The current scenario-runner test suite pays the startup cost of a fresh Node process and a fresh Ranvier bootstrap for each test case.

Most of the cost is repeated work:

- Node process startup,
- config loading,
- `ranvier` bootstrap,
- bundle discovery and bundle loading,
- repeated construction of `GameState`,
- repeated scenario-runner setup that is mostly identical across tests.

The largest hotspot is the scenario-runner suite in `bundles/bundle-rantamuta/tests/scenarios/scenario.basic.test.js`, which currently shells out to `node util/scenario-runner.js` for many narrow assertions.

That is a good fit for CLI realism, but it is a poor default for fast local feedback. The suite spends most of its time paying startup cost instead of executing gameplay assertions.

## Why This Matters

This design exists to speed up the test suite.

The purpose is not to design a new general scenario framework. The purpose is to reduce repeated boot cost enough that `npm test` becomes noticeably faster while preserving a small amount of subprocess coverage where it still carries value.

## Desired Outcome

We want a test structure where:

- most scenario assertions run against one shared booted runtime per test file,
- each individual test still gets isolated player/session state,
- a smaller subprocess smoke layer still covers the CLI path,
- the existing scenario-runner CLI behavior remains stable,
- the first implementation slice produces a noticeable reduction in scenario-suite wall-clock time.

## Non-Goals

- No change to the public CLI behavior of `util/scenario-runner.js`.
- No compatibility change to wrapper boot, config loading, bundle loading, or command semantics.
- No engine-internal redesign in `Rantamuta/core`.
- No speculative optimization of unrelated test suites.
- No attempt to deep-clone or snapshot the full world graph unless simpler isolation proves insufficient.
- No effort to turn this into a broad multi-bundle scenario platform beyond what is needed to keep the harness honest at the `ranviermud` level.

## Current State

`util/scenario-runner.js` currently owns both:

- the CLI surface and output formatting, and
- the in-process runtime/bootstrap/execution logic.

That file currently:

- parses arguments and `.scenario` files,
- loads config,
- boots Ranvier and loads bundles,
- creates a fake player and fake socket,
- seeds inventory and room items,
- routes commands through input-event `"main"`,
- captures output and optional JSON events,
- exits with CLI-appropriate status.

This makes the file useful as a smoke-test CLI, but it also makes the test suite use the most expensive possible path for every scenario assertion.

The current file also contains one explicit `bundle-rantamuta` coupling:

- it imports `../bundles/bundle-rantamuta/lib/parse-input` directly for parse metadata enrichment.

That is acceptable today for the CLI, but it should not become the center of this design. The speedup objective is primary.

## Strategy

The core speedup strategy is simple:

1. Extract reusable scenario execution logic out of `util/scenario-runner.js`.
2. Keep `util/scenario-runner.js` as a thin CLI wrapper.
3. Add an in-process test harness that boots the runtime once per file.
4. Migrate the majority of low-risk scenario assertions to the in-process harness.
5. Keep a small subprocess smoke layer for CLI coverage and higher-risk cases.

This is a performance optimization through reuse, not a behavior redesign.

## Proposed Shape

### Shared runner module

Move reusable scenario-runner logic into a shared module, recommended as:

- `util/scenario-runner-lib.js`

That shared module should support:

- booting the configured runtime,
- creating a fresh per-run player/session,
- placing the player in a room,
- seeding inventory and room items,
- executing input through the existing input-event path,
- collecting output and structured events,
- cleaning up per-run state.

### CLI wrapper

Keep `util/scenario-runner.js` as the authoritative CLI entry point.

After refactor, it should still be responsible for:

- reading `process.argv`,
- printing help text,
- printing textual or JSON output,
- setting process exit code,
- preserving current error behavior.

### Test harness

Add a harness-backed test helper that:

- boots the runtime once for the file,
- exposes a `runScenario(...)`-style helper,
- creates fresh per-test player/session state,
- returns a stable result object for assertions,
- performs explicit cleanup after each run.

## First Implementation Slice

The first slice should target the highest payoff, lowest-risk cases.

### Move to the in-process harness first

These are the best initial migration targets:

- room look assertions,
- shorthand canonicalization,
- simple movement,
- inventory listing,
- simple take/put flows,
- JSON event shape assertions,
- seed event assertions.

These cases are narrow, frequent, and mostly depend on ephemeral player state plus short-lived seeded items.

### Keep subprocess coverage first

These should remain subprocess-based initially:

- `--help`,
- missing-value error paths,
- unsupported legacy flag behavior,
- one `.scenario` file smoke case,
- one `--json` smoke case,
- any scenario whose cleanup path is less obvious than its setup path,
- any scenario intentionally validating process-boundary CLI behavior.

### Expected payoff from the first slice

The first slice should aim for:

- a visible reduction in scenario-suite runtime,
- no change in CLI behavior,
- no new ordering-sensitive flakiness,
- a clear basis for deciding whether more authored scenarios are worth migrating.

## Isolation Model

The performance win only matters if tests remain deterministic and trustworthy.

Each harness-backed test run should get:

- a fresh fake player,
- a fresh fake session,
- fresh output/event buffers,
- fresh seeded items,
- no dependency on another test's player location or inventory.

Cleanup should be explicit. Track and remove:

- created players,
- seeded items,
- player room placement,
- inventory placement,
- per-run buffers.

The first implementation should not attempt:

- full deep cloning of `GameState`,
- snapshotting the whole world graph,
- hidden reset of arbitrary bundle state.

Those approaches are more complex than the problem requires.

## Guardrails

These constraints matter because they protect the speedup from turning into accidental scope expansion.

### Preserve the CLI contract

The refactor must not change the public CLI behavior of `util/scenario-runner.js` unless explicitly approved.

### Keep the harness repo-level, not bundle-hardwired

The harness should remain a `ranviermud`-level utility rather than a `bundle-rantamuta` helper.

That means the core harness should not require `bundle-rantamuta` parser code in order to execute scenarios.

### Discover capabilities from the booted runtime

The harness must discover scenario capabilities only by inspecting the booted runtime after booting the configured bundle set.

This keeps the harness honest with respect to configured bundle loading and avoids inventing a new discovery model.

### Optional enrichments stay optional

If richer parse or telemetry enrichment depends on bundle-specific surfaces, those enrichments should remain optional and must not block baseline harness execution.

## Compatibility Posture

This design needs only a small compatibility model.

### Baseline runnable runtime

The harness can execute scenarios when:

- the configured bundles boot successfully, and
- the booted runtime provides a playable input-event surface.

### Reduced-capability runtime

If optional parse-enrichment surfaces are absent, the harness should still run baseline scenarios and simply omit the extra enrichment.

### Non-playable runtime

If the booted runtime does not expose a playable scenario surface, the harness should fail clearly rather than pretending support.

This is enough for the speedup goal. The document does not need a broader compatibility taxonomy than that.

## Suggested Result Shape

To keep migrated tests simple, the harness should return a result shape close to what subprocess tests already assert against:

```js
{
  status: 0,
  stdout: '...',
  stderr: '',
  events: [...],
}
```

This keeps migration costs low and preserves the current style of assertions.

## Migration Plan

### Phase 1: extract shared logic

Refactor `util/scenario-runner.js` into:

- shared reusable execution logic,
- thin CLI wrapper with no intended behavior change.

Validation target:

- existing subprocess-based scenario tests still pass.

### Phase 2: add the harness and migrate a few low-risk tests

Introduce a harness-backed helper and migrate a small first set of low-risk scenario tests.

Validation target:

- cleanup model works,
- no ordering sensitivity appears,
- runtime reduction is measurable.

### Phase 3: migrate the low-risk majority

Move the obvious high-payoff scenario assertions to the shared harness path.

Validation target:

- the scenario suite is materially faster,
- remaining subprocess coverage is intentional and small.

### Phase 4: review the remaining subprocess scenarios

For each remaining subprocess scenario:

- migrate it if cleanup is straightforward and worth the runtime savings,
- otherwise leave it as subprocess coverage.

Stop once the runtime improvement is good enough. This design does not require migrating every scenario.

## Open Questions

1. Which exact scenario tests belong in the first low-risk migration slice?

2. How much CLI subprocess coverage is enough after the first migration pass?

3. Are any currently slow authored scenarios worth keeping subprocess-based permanently because their cleanup risk outweighs their runtime cost?

## Acceptance Criteria

- The design remains clearly centered on reducing `npm test` wall-clock time.
- The design preserves the existing scenario-runner CLI contract.
- The design defines a first migration slice that targets high-payoff, low-risk scenario tests.
- The design keeps only the minimum harness generality needed to avoid hardwiring `bundle-rantamuta` into the core.
- The design preserves deterministic test isolation through explicit per-run cleanup.
